"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import {
  ACADEMIC_TERMS_QUERY_KEY,
  ACADEMIC_YEARS_QUERY_KEY,
  CLASS_TEMPLATES_QUERY_KEY,
  CURRICULUM_VERSIONS_QUERY_KEY,
  GRADE_LEVELS_QUERY_KEY,
} from "@/lib/query/queries/use-academic-config";
import {
  COPY_RUN_QUERY_KEY,
  copyRunQueryKey,
  type CopyIdMap,
  type CopyItem,
  type CopyRun,
  type CopyStepResult,
  type CopyTermDate,
} from "@/lib/query/queries/use-year-copy";

export type StartCopyRunInput = {
  source_academic_year_id: string;
  items: CopyItem[];
  term_dates?: CopyTermDate[];
};

export type UpdateCopyRunInput =
  | { step: "ops" | "grading"; result: unknown }
  | { status: "completed" | "cancelled" };

export type CopyConfigBody = {
  source_academic_year_id: string;
  target_academic_year_id: string;
  copy_run_id?: string;
  items: CopyItem[];
  term_dates?: CopyTermDate[];
  dry_run?: boolean;
};

export type CopyServiceBody = {
  source_academic_year_id: string;
  target_academic_year_id: string;
  copy_run_id?: string;
  items: CopyItem[];
  id_map?: CopyIdMap;
  dry_run?: boolean;
};

export type CopyConfigResponse = CopyStepResult & { id_map: CopyIdMap };

export function copyConfig(body: CopyConfigBody) {
  return apiFetch<CopyConfigResponse>({
    service: "academic-config",
    path: "/api/v1/academic-config/academic-years/copy",
    method: "POST",
    authenticated: true,
    body,
  });
}

export function copyOps(body: CopyServiceBody) {
  return apiFetch<CopyStepResult>({
    service: "academic-ops",
    path: "/api/v1/academic-ops/academic-years/copy",
    method: "POST",
    authenticated: true,
    body,
  });
}

export function copyGrading(body: CopyServiceBody) {
  return apiFetch<CopyStepResult>({
    service: "grading",
    path: "/api/v1/grading/academic-years/copy",
    method: "POST",
    authenticated: true,
    body,
  });
}

function useInvalidateAfterCopy() {
  const qc = useQueryClient();
  return () => {
    for (const queryKey of [
      COPY_RUN_QUERY_KEY,
      ACADEMIC_YEARS_QUERY_KEY,
      ACADEMIC_TERMS_QUERY_KEY,
      GRADE_LEVELS_QUERY_KEY,
      CLASS_TEMPLATES_QUERY_KEY,
      CURRICULUM_VERSIONS_QUERY_KEY,
    ]) {
      qc.invalidateQueries({ queryKey });
    }
  };
}

export function useStartCopyRun(targetYearId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StartCopyRunInput) =>
      apiFetch<CopyRun>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${targetYearId}/copy-runs`,
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: copyRunQueryKey(targetYearId) }),
  });
}

/** Updates a run; also refreshes the copied-data caches once the run completes. */
export function useUpdateCopyRun() {
  const invalidate = useInvalidateAfterCopy();
  return useMutation({
    mutationFn: (vars: { copyRunId: string } & UpdateCopyRunInput) => {
      const { copyRunId, ...body } = vars;
      return updateCopyRun(copyRunId, body);
    },
    onSuccess: (_run, vars) => {
      if ("status" in vars) invalidate();
    },
  });
}

export function updateCopyRun(copyRunId: string, body: UpdateCopyRunInput) {
  return apiFetch<CopyRun>({
    service: "academic-config",
    path: `/api/v1/academic-config/copy-runs/${copyRunId}`,
    method: "PATCH",
    authenticated: true,
    body,
  });
}
