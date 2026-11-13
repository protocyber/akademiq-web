"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { ApiHttpError } from "@/lib/api/types";

export type CopyItem =
  | "terms"
  | "grade_levels"
  | "classes"
  | "homeroom_teachers"
  | "curriculum"
  | "grading_policy"
  | "report_types"
  | "evaluation_weights"
  | "teaching_assignments"
  | "timetable";

export type CopyItemResult = {
  item: CopyItem;
  source: number;
  target_existing: number;
  copied: number;
  skipped: number;
};

export type CopyIdMap = {
  terms: Record<string, string>;
  grade_levels: Record<string, string>;
  subjects: Record<string, string>;
};

export type CopyTermDate = {
  source_term_id: string;
  name: string;
  start_date: string;
  end_date: string;
};

export type CopyStepResult = { results: CopyItemResult[]; [key: string]: unknown };

export type CopyRun = {
  copy_run_id: string;
  source_academic_year_id: string;
  target_academic_year_id: string;
  items: CopyItem[];
  term_dates: CopyTermDate[] | null;
  status: "in_progress" | "completed" | "cancelled";
  id_map: CopyIdMap | null;
  config_result: CopyStepResult | null;
  ops_result: CopyStepResult | null;
  grading_result: CopyStepResult | null;
  created_at: string;
  updated_at: string;
};

export const COPY_RUN_QUERY_KEY = ["academic-config", "copy-run"] as const;

export function copyRunQueryKey(targetYearId?: string) {
  return [...COPY_RUN_QUERY_KEY, targetYearId ?? ""] as const;
}

/**
 * The in-progress copy run of a target year, or `null` when there is none
 * (the backend answers 404 in that case).
 */
export function useCurrentCopyRun(targetYearId?: string) {
  return useQuery({
    queryKey: copyRunQueryKey(targetYearId),
    queryFn: async (): Promise<CopyRun | null> => {
      try {
        return await apiFetch<CopyRun>({
          service: "academic-config",
          path: `/api/v1/academic-config/academic-years/${targetYearId}/copy-runs/current`,
          authenticated: true,
        });
      } catch (error) {
        if (error instanceof ApiHttpError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(targetYearId),
  });
}
