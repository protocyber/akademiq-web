"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { HOMEROOMS_QUERY_KEY } from "@/lib/query/queries/use-academic-ops";
import {
  PROMOTION_QUERY_KEY,
  type PromotionDecision,
  type PromotionRun,
  type PromotionRunOutcome,
} from "@/lib/query/queries/use-promotion";
import type { CriteriaPayload, PromotionResultValue } from "@/lib/schemas/promotion";

const BASE = "/api/v1/academic-ops/promotion-runs";

/** Every promotion write refetches promotion data on success *and* error, so a 409 shows fresh state. */
function useSettle() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: PROMOTION_QUERY_KEY });
}

export function useCreatePromotionRun() {
  const settle = useSettle();
  return useMutation({
    mutationFn: (input: CriteriaPayload & { academic_year_id: string }) =>
      apiFetch<PromotionRunOutcome>({ service: "academic-ops", path: BASE, method: "POST", authenticated: true, body: input }),
    onSettled: settle,
  });
}

export function useReevaluatePromotionRun(runId: string) {
  const settle = useSettle();
  return useMutation({
    mutationFn: (input: CriteriaPayload) =>
      apiFetch<PromotionRunOutcome>({
        service: "academic-ops",
        path: `${BASE}/${runId}/evaluate`,
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSettled: settle,
  });
}

export function useOverrideDecision(runId: string) {
  const settle = useSettle();
  return useMutation({
    mutationFn: ({ decisionId, result, reason }: { decisionId: string; result: PromotionResultValue; reason: string }) =>
      apiFetch<PromotionDecision>({
        service: "academic-ops",
        path: `${BASE}/${runId}/decisions/${decisionId}`,
        method: "PATCH",
        authenticated: true,
        body: { result, reason: reason.trim() === "" ? null : reason.trim() },
      }),
    onSettled: settle,
  });
}

export type PromotionTransition = "submit" | "approve" | "return";

export function useTransitionPromotionRun(runId: string) {
  const settle = useSettle();
  return useMutation({
    mutationFn: (action: PromotionTransition) =>
      apiFetch<PromotionRun>({ service: "academic-ops", path: `${BASE}/${runId}/${action}`, method: "POST", authenticated: true, body: {} }),
    onSettled: settle,
  });
}

export function useSetPromotionTarget(runId: string) {
  const settle = useSettle();
  return useMutation({
    mutationFn: (targetAcademicYearId: string) =>
      apiFetch<PromotionRun & { cleared_targets: number }>({
        service: "academic-ops",
        path: `${BASE}/${runId}/target`,
        method: "PUT",
        authenticated: true,
        body: { target_academic_year_id: targetAcademicYearId },
      }),
    onSettled: settle,
  });
}

export type TargetAssignment = { decision_id: string; homeroom_id: string | null };

export function useAssignPromotionTargets(runId: string) {
  const settle = useSettle();
  return useMutation({
    mutationFn: (assignments: TargetAssignment[]) =>
      apiFetch<{ updated: number }>({
        service: "academic-ops",
        path: `${BASE}/${runId}/targets`,
        method: "PATCH",
        authenticated: true,
        body: { assignments },
      }),
    onSettled: settle,
  });
}

export type ExecutionCounts = { promoted: number; retained: number; graduated: number };

export function useExecutePromotionRun(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<PromotionRun & { counts: ExecutionCounts }>({
        service: "academic-ops",
        path: `${BASE}/${runId}/execute`,
        method: "POST",
        authenticated: true,
        body: {},
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: PROMOTION_QUERY_KEY });
      // Enrolled counts of source and target homerooms change.
      void qc.invalidateQueries({ queryKey: HOMEROOMS_QUERY_KEY });
    },
  });
}
