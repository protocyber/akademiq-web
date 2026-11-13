import { describe, expect, it, vi, type Mock } from "vitest";

import { ApiHttpError } from "@/lib/api/types";
import type { CopyRun } from "@/lib/query/queries/use-year-copy";

import { runCopy, type RunCopyDeps } from "./run-copy";

const ID_MAP = {
  terms: { s1: "t1" },
  grade_levels: { g1: "h1" },
  subjects: { x: "y" },
};

function makeRun(overrides: Partial<CopyRun> = {}): CopyRun {
  return {
    copy_run_id: "run-1",
    source_academic_year_id: "src",
    target_academic_year_id: "tgt",
    items: [
      "terms",
      "grade_levels",
      "classes",
      "curriculum",
      "grading_policy",
      "report_types",
      "evaluation_weights",
    ],
    term_dates: null,
    status: "in_progress",
    id_map: null,
    config_result: null,
    ops_result: null,
    grading_result: null,
    created_at: "2026-11-12T00:00:00Z",
    updated_at: "2026-11-12T00:00:00Z",
    ...overrides,
  } as CopyRun;
}

type MockDeps = { [K in keyof RunCopyDeps]: Mock<RunCopyDeps[K]> };

function makeDeps(overrides: Partial<MockDeps> = {}): MockDeps {
  const deps: MockDeps = {
    copyConfig: vi.fn().mockResolvedValue({ results: [], id_map: ID_MAP }),
    copyOps: vi.fn().mockResolvedValue({ results: [] }),
    copyGrading: vi.fn().mockResolvedValue({ results: [] }),
    updateRun: vi.fn().mockResolvedValue(undefined),
    sleep: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return deps;
}

const notReady = () =>
  new ApiHttpError(409, { code: "COPY_DEPENDENCY_NOT_READY", message: "not ready" });

describe("runCopy", () => {
  it("runs config, ops, grading in order and completes", async () => {
    const deps = makeDeps();
    const events: string[] = [];
    await runCopy(makeRun(), deps, (step, state) => events.push(`${step}:${state}`));

    expect(events).toEqual([
      "config:running",
      "config:done",
      "ops:running",
      "ops:done",
      "grading:running",
      "grading:done",
    ]);
    expect(deps.copyConfig.mock.calls[0][0]).toMatchObject({
      source_academic_year_id: "src",
      target_academic_year_id: "tgt",
      copy_run_id: "run-1",
      items: ["terms", "grade_levels", "classes", "curriculum", "grading_policy"],
    });
    expect(deps.copyOps.mock.calls[0][0]).toMatchObject({
      items: ["classes"],
      id_map: ID_MAP,
    });
    expect(deps.copyGrading.mock.calls[0][0]).toMatchObject({
      items: ["report_types", "evaluation_weights"],
      id_map: ID_MAP,
    });
    expect(deps.updateRun.mock.calls.map((c) => c[0])).toEqual([
      { step: "ops", result: expect.anything() },
      { step: "grading", result: expect.anything() },
      { status: "completed" },
    ]);
  });

  it("resumes after the config step", async () => {
    const deps = makeDeps();
    const run = makeRun({ config_result: { results: [] }, id_map: ID_MAP });
    await runCopy(run, deps, () => {});
    expect(deps.copyConfig).not.toHaveBeenCalled();
    expect(deps.copyOps.mock.calls[0][0].id_map).toEqual(ID_MAP);
    expect(deps.updateRun).toHaveBeenLastCalledWith({ status: "completed" });
  });

  it("retries not-ready then succeeds", async () => {
    const deps = makeDeps({
      copyOps: vi.fn().mockRejectedValueOnce(notReady()).mockResolvedValue({ results: [] }),
    });
    const events: string[] = [];
    await runCopy(makeRun(), deps, (step, state) => events.push(`${step}:${state}`));
    expect(deps.sleep).toHaveBeenCalledWith(1000);
    expect(deps.copyOps).toHaveBeenCalledTimes(2);
    expect(events).toContain("ops:waiting");
    expect(deps.updateRun).toHaveBeenLastCalledWith({ status: "completed" });
  });

  it("gives up after the last delay and reports error", async () => {
    const deps = makeDeps({ copyOps: vi.fn().mockRejectedValue(notReady()) });
    const events: string[] = [];
    await runCopy(makeRun(), deps, (step, state) => events.push(`${step}:${state}`));
    expect(deps.sleep.mock.calls.map((c) => c[0])).toEqual([1000, 2000, 4000, 8000, 15000, 30000]);
    expect(deps.copyOps).toHaveBeenCalledTimes(7);
    expect(events.at(-1)).toBe("ops:error");
    expect(deps.copyGrading).not.toHaveBeenCalled();
  });

  it("stops on another error", async () => {
    const deps = makeDeps({
      copyOps: vi
        .fn()
        .mockRejectedValue(new ApiHttpError(500, { code: "INTERNAL", message: "boom" })),
    });
    const events: string[] = [];
    await runCopy(makeRun(), deps, (step, state) => events.push(`${step}:${state}`));
    expect(events.at(-1)).toBe("ops:error");
    expect(deps.sleep).not.toHaveBeenCalled();
    expect(deps.copyGrading).not.toHaveBeenCalled();
    expect(deps.updateRun).not.toHaveBeenCalledWith({ status: "completed" });
  });

  it("skips grading when no grading items", async () => {
    const deps = makeDeps();
    const run = makeRun({ items: ["terms", "grade_levels", "classes"] });
    const events: string[] = [];
    await runCopy(run, deps, (step, state) => events.push(`${step}:${state}`));
    expect(deps.copyGrading).not.toHaveBeenCalled();
    expect(events.some((e) => e.startsWith("grading"))).toBe(false);
    expect(deps.updateRun).toHaveBeenLastCalledWith({ status: "completed" });
  });

  it("adds classes to the ops call when only teaching assignments are selected", async () => {
    const deps = makeDeps();
    const run = makeRun({ items: ["curriculum", "teaching_assignments"] });
    await runCopy(run, deps, () => {});
    expect(deps.copyOps.mock.calls[0][0].items).toEqual(["classes", "teaching_assignments"]);
  });

  it("errors when ops has no grade level map", async () => {
    const deps = makeDeps({
      copyConfig: vi.fn().mockResolvedValue({
        results: [],
        id_map: { terms: {}, grade_levels: {}, subjects: {} },
      }),
    });
    const events: string[] = [];
    await runCopy(makeRun(), deps, (step, state) => events.push(`${step}:${state}`));
    expect(deps.copyOps).not.toHaveBeenCalled();
    expect(events.at(-1)).toBe("ops:error");
    expect(deps.updateRun).not.toHaveBeenCalledWith({ status: "completed" });
  });
});
