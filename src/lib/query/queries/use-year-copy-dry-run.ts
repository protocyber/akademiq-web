"use client";

import { useQuery } from "@tanstack/react-query";

import { copyConfig, copyGrading, copyOps } from "@/lib/query/mutations/use-year-copy";
import type { CopyItem } from "@/lib/query/queries/use-year-copy";

export const COPY_DRY_RUN_QUERY_KEY = ["academic-config", "copy-dry-run"] as const;

const CONFIG_DRY_ITEMS: CopyItem[] = [
  "terms",
  "grade_levels",
  "classes",
  "curriculum",
  "grading_policy",
];
const OPS_DRY_ITEMS: CopyItem[] = [
  "classes",
  "homeroom_teachers",
  "teaching_assignments",
  "timetable",
];
const GRADING_DRY_ITEMS: CopyItem[] = ["report_types", "evaluation_weights"];

/**
 * Dry-run of the three copy endpoints (no id_map, no copy_run_id). Each query
 * fails on its own, so one service being down does not hide the other counts.
 */
export function useCopyDryRuns(
  sourceYearId: string | undefined,
  targetYearId: string | undefined,
  enabled: boolean,
) {
  const active = Boolean(enabled && sourceYearId && targetYearId);
  const base = {
    source_academic_year_id: sourceYearId ?? "",
    target_academic_year_id: targetYearId ?? "",
    dry_run: true,
  };
  const options = { enabled: active, staleTime: 30_000, retry: false } as const;
  const key = (service: string) =>
    [...COPY_DRY_RUN_QUERY_KEY, service, sourceYearId ?? "", targetYearId ?? ""] as const;

  const config = useQuery({
    queryKey: key("config"),
    queryFn: () => copyConfig({ ...base, items: CONFIG_DRY_ITEMS }),
    ...options,
  });
  const ops = useQuery({
    queryKey: key("ops"),
    queryFn: () => copyOps({ ...base, items: OPS_DRY_ITEMS }),
    ...options,
  });
  const grading = useQuery({
    queryKey: key("grading"),
    queryFn: () => copyGrading({ ...base, items: GRADING_DRY_ITEMS }),
    ...options,
  });
  return { config, ops, grading };
}
