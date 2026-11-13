"use client";

import { useQuery } from "@tanstack/react-query";

import { copyConfig, copyGrading, copyOps } from "@/lib/query/mutations/use-year-copy";
import {
  CONFIG_ITEMS,
  GRADING_ITEMS,
  OPS_ITEMS,
} from "@/components/features/academic-config/year-copy/checklist";

export const COPY_DRY_RUN_QUERY_KEY = ["academic-config", "copy-dry-run"] as const;

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
    queryFn: () => copyConfig({ ...base, items: CONFIG_ITEMS }),
    ...options,
  });
  const ops = useQuery({
    queryKey: key("ops"),
    queryFn: () => copyOps({ ...base, items: OPS_ITEMS }),
    ...options,
  });
  const grading = useQuery({
    queryKey: key("grading"),
    queryFn: () => copyGrading({ ...base, items: GRADING_ITEMS }),
    ...options,
  });
  return { config, ops, grading };
}
