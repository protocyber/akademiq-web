import { ApiHttpError } from "@/lib/api/types";

import { CONFIG_ITEMS, GRADING_ITEMS, OPS_ITEMS } from "./checklist";
import type {
  CopyIdMap,
  CopyItem,
  CopyRun,
  CopyStepResult,
} from "@/lib/query/queries/use-year-copy";
import type {
  CopyConfigBody,
  CopyConfigResponse,
  CopyServiceBody,
  UpdateCopyRunInput,
} from "@/lib/query/mutations/use-year-copy";

export type CopyStep = "config" | "ops" | "grading";
export type CopyStepState = "running" | "done" | "waiting" | "error";

export type RunCopyDeps = {
  copyConfig: (body: CopyConfigBody) => Promise<CopyConfigResponse>;
  copyOps: (body: CopyServiceBody) => Promise<CopyStepResult>;
  copyGrading: (body: CopyServiceBody) => Promise<CopyStepResult>;
  updateRun: (input: UpdateCopyRunInput) => Promise<unknown>;
  sleep: (ms: number) => Promise<void>;
};

export type CopyProgress = (
  step: CopyStep,
  state: CopyStepState,
  result?: CopyStepResult | { error: unknown },
) => void;

/** Seconds waited before each retry of COPY_DEPENDENCY_NOT_READY. */
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000, 30000];

const isNotReady = (e: unknown) =>
  e instanceof ApiHttpError && e.code === "COPY_DEPENDENCY_NOT_READY";

async function withRetry<T>(
  call: () => Promise<T>,
  sleep: (ms: number) => Promise<void>,
  onWaiting: () => void,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      if (!isNotReady(error) || attempt >= RETRY_DELAYS_MS.length) throw error;
      onWaiting();
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

const isEmpty = (m: Record<string, string> | undefined) => !m || Object.keys(m).length === 0;

/**
 * Drives a copy run: academic-config -> academic-ops -> grading. Steps with no
 * items, or whose result is already stored on the run, are skipped. Never
 * throws; failures are reported through `onProgress(step, "error", { error })`.
 */
export async function runCopy(
  run: CopyRun,
  deps: RunCopyDeps,
  onProgress: CopyProgress,
): Promise<void> {
  const items = new Set(run.items);
  const pick = (owned: CopyItem[]) => owned.filter((i) => items.has(i));
  const configItems = pick(CONFIG_ITEMS);
  let opsItems = pick(OPS_ITEMS);
  const gradingItems = pick(GRADING_ITEMS);
  // The backend requires `classes` whenever any other ops item is sent. Target
  // classes that already exist are skipped, so adding it is harmless.
  if (opsItems.length > 0 && !opsItems.includes("classes")) opsItems = ["classes", ...opsItems];

  let idMap: CopyIdMap | null = run.id_map;
  const base = {
    source_academic_year_id: run.source_academic_year_id,
    target_academic_year_id: run.target_academic_year_id,
    copy_run_id: run.copy_run_id,
  };

  const fail = (step: CopyStep, error: unknown) => onProgress(step, "error", { error });

  // Downstream services need the id map. With no config item selected, config
  // is still called once (it copies nothing) so it maps existing target terms,
  // grade levels and subjects; that call is reported on the first step needing it.
  const downstream: CopyStep | null =
    opsItems.length > 0 && !run.ops_result
      ? "ops"
      : gradingItems.length > 0 && !run.grading_result
        ? "grading"
        : null;
  const mapOnly = configItems.length === 0 && downstream !== null && !run.config_result;

  if ((configItems.length > 0 || mapOnly) && !run.config_result) {
    const step: CopyStep = mapOnly ? downstream! : "config";
    if (!mapOnly) onProgress("config", "running");
    try {
      const res = await withRetry(
        () =>
          deps.copyConfig({
            ...base,
            // Never send a config-owned item (e.g. the implied `classes`) here:
            // config would copy it.
            items: mapOnly
              ? [...opsItems, ...gradingItems].filter((i) => !CONFIG_ITEMS.includes(i))
              : configItems,
            ...(run.term_dates && !mapOnly ? { term_dates: run.term_dates } : {}),
          }),
        deps.sleep,
        () => onProgress(step, "waiting"),
      );
      idMap = res.id_map ?? idMap;
      if (!mapOnly) onProgress("config", "done", res);
    } catch (error) {
      fail(step, error);
      return;
    }
  }

  if (opsItems.length > 0 && !run.ops_result) {
    if (isEmpty(idMap?.grade_levels)) {
      fail("ops", new Error("Peta tingkat belum tersedia. Salin Tingkat terlebih dahulu."));
      return;
    }
    onProgress("ops", "running");
    try {
      const res = await withRetry(
        () => deps.copyOps({ ...base, items: opsItems, id_map: idMap ?? undefined }),
        deps.sleep,
        () => onProgress("ops", "waiting"),
      );
      await deps.updateRun({ step: "ops", result: res });
      onProgress("ops", "done", res);
    } catch (error) {
      fail("ops", error);
      return;
    }
  }

  if (gradingItems.length > 0 && !run.grading_result) {
    if (isEmpty(idMap?.terms)) {
      fail("grading", new Error("Peta semester belum tersedia. Salin Semester terlebih dahulu."));
      return;
    }
    onProgress("grading", "running");
    try {
      const res = await withRetry(
        () => deps.copyGrading({ ...base, items: gradingItems, id_map: idMap ?? undefined }),
        deps.sleep,
        () => onProgress("grading", "waiting"),
      );
      await deps.updateRun({ step: "grading", result: res });
      onProgress("grading", "done", res);
    } catch (error) {
      fail("grading", error);
      return;
    }
  }

  try {
    await deps.updateRun({ status: "completed" });
  } catch (error) {
    fail("grading", error);
  }
}
