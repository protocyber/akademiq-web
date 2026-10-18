"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useTenantPermissions } from "@/lib/query/queries/use-tenant-roles";

export const PROMOTION_QUERY_KEY = ["academic-ops", "promotion"] as const;

export type PromotionStatus = "draft" | "submitted" | "approved" | "executed";
export type PromotionResult = "promote" | "retain" | "graduate";

export type PromotionRun = {
  run_id: string;
  academic_year_id: string;
  report_type_id: string;
  rule_id: string;
  status: PromotionStatus;
  created_by: string;
  approved_by: string | null;
  target_academic_year_id: string | null;
  executed_by: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PromotionCriteria = {
  min_average: number | null;
  max_subjects_below_kkm: number | null;
  min_attendance_percent: number | null;
};

export type PromotionCounts = { promote: number; retain: number; graduate: number };

export type PlacementEntry = {
  homeroom_id: string;
  name: string;
  capacity: number;
  existing_active: number;
  assigned: number;
  total: number;
  over_capacity: boolean;
};

export type PromotionRunDetail = {
  run: PromotionRun;
  criteria: PromotionCriteria;
  kkm: number;
  counts: PromotionCounts;
  overridden: number;
  cannot_evaluate: string[];
  placement: PlacementEntry[];
  unassigned: number;
};

export type DecisionMetrics = {
  subjects_counted: number;
  subjects_below_kkm: number;
  average: number | null;
  kkm_used: number;
  criteria: PromotionCriteria;
};

export type PromotionDecision = {
  decision_id: string;
  student_id: string;
  homeroom_id: string;
  recommended: PromotionResult;
  result: PromotionResult;
  overridden: boolean;
  reason: string | null;
  computed_metrics: DecisionMetrics;
  target_homeroom_id: string | null;
  target_enrollment_id: string | null;
  full_name: string | null;
  nis: string | null;
  homeroom_name: string | null;
  source_ordinal: number | null;
};

/** Response of create and re-evaluate. */
export type PromotionRunOutcome = {
  run_id: string;
  status: PromotionStatus;
  report_type_id: string;
  rule_id: string;
  counts: PromotionCounts;
  cannot_evaluate: string[];
  discarded_overrides: number;
};

const BASE = "/api/v1/academic-ops/promotion-runs";

export function usePromotionRuns(academicYearId?: string) {
  return useQuery({
    queryKey: [...PROMOTION_QUERY_KEY, "runs", academicYearId],
    queryFn: () =>
      apiFetch<PromotionRun[]>({
        service: "academic-ops",
        path: `${BASE}?academic_year_id=${academicYearId}`,
        authenticated: true,
      }),
    enabled: Boolean(academicYearId),
  });
}

export function usePromotionRun(runId?: string) {
  return useQuery({
    queryKey: [...PROMOTION_QUERY_KEY, "run", runId],
    queryFn: () =>
      apiFetch<PromotionRunDetail>({ service: "academic-ops", path: `${BASE}/${runId}`, authenticated: true }),
    enabled: Boolean(runId),
  });
}

export function usePromotionDecisions(runId?: string) {
  return useQuery({
    queryKey: [...PROMOTION_QUERY_KEY, "decisions", runId],
    queryFn: () =>
      apiFetch<PromotionDecision[]>({
        service: "academic-ops",
        path: `${BASE}/${runId}/decisions`,
        authenticated: true,
      }),
    enabled: Boolean(runId),
  });
}

/** Who may see and act on promotion runs (spec §4.2). */
export function usePromotionAccess() {
  const tenant = useTenantMe();
  const permissions = useTenantPermissions();
  const me = useMe();
  return React.useMemo(() => {
    const held = new Set((permissions.data ?? []).filter((p) => p.held).map((p) => p.code));
    const ops = tenant.data?.modules.find((m) => m.feature_code === "academic_ops");
    const canManage = held.has("promotion.manage");
    const canApprove = held.has("promotion.approve");
    return {
      isLoading: tenant.isLoading || permissions.isLoading || me.isLoading,
      moduleEnabled: Boolean(ops?.plan_entitled && ops.enabled),
      canRead: canManage || canApprove,
      canManage,
      canApprove,
      userId: me.data?.user_id ?? null,
    };
  }, [tenant.data, tenant.isLoading, permissions.data, permissions.isLoading, me.data, me.isLoading]);
}
