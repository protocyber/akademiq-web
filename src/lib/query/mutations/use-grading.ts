"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import type { EvaluationForm, EvaluationUpdateForm, GradeEntryForm, ReportCardGenerateForm, ReportCardTransitionForm } from "@/lib/schemas/grading";
import { classGradesQueryKey, evaluationsQueryKey, reportCardsQueryKey, type Evaluation, type Grade, type ReportCard } from "@/lib/query/queries/use-grading";

// ── Evaluation mutations ─────────────────────────────────────────────────────

export function useCreateEvaluation(homeroomId?: string, subjectId?: string, academicYearId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EvaluationForm) =>
      apiFetch<Evaluation>({
        service: "grading",
        path: "/api/v1/grading/evaluations",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: evaluationsQueryKey(homeroomId, subjectId, academicYearId) }),
  });
}

export function useUpdateEvaluation(homeroomId?: string, subjectId?: string, academicYearId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ evaluationId, ...body }: EvaluationUpdateForm & { evaluationId: string }) =>
      apiFetch<Evaluation>({
        service: "grading",
        path: `/api/v1/grading/evaluations/${evaluationId}`,
        method: "PATCH",
        authenticated: true,
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: evaluationsQueryKey(homeroomId, subjectId, academicYearId) }),
  });
}

export function useDeleteEvaluation(homeroomId?: string, subjectId?: string, academicYearId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (evaluationId: string) =>
      apiFetch<void>({
        service: "grading",
        path: `/api/v1/grading/evaluations/${evaluationId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: evaluationsQueryKey(homeroomId, subjectId, academicYearId) });
      qc.invalidateQueries({ queryKey: classGradesQueryKey(homeroomId, subjectId, academicYearId) });
    },
  });
}

// ── Grade mutations ──────────────────────────────────────────────────────────

export function useUpsertGrade(homeroomId?: string, subjectId?: string, academicYearId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GradeEntryForm) =>
      apiFetch<Grade>({
        service: "grading",
        path: "/api/v1/grading/grades",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: classGradesQueryKey(homeroomId, subjectId, academicYearId) }),
  });
}

// ── Report-card mutations ────────────────────────────────────────────────────

export function useGenerateReportCards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReportCardGenerateForm) =>
      apiFetch<{ generated: ReportCard[]; skipped: string[] }>({
        service: "grading",
        path: "/api/v1/grading/report-cards/generate",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: (_result, input) => qc.invalidateQueries({ queryKey: reportCardsQueryKey(input.homeroom_id, input.academic_year_id) }),
  });
}

export function useTransitionReportCard(reportCardId: string, homeroomId?: string, academicYearId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, input }: { action: "submit" | "homeroom-approve" | "return" | "principal-approve" | "reject"; input?: ReportCardTransitionForm }) =>
      apiFetch<ReportCard>({
        service: "grading",
        path: `/api/v1/grading/report-cards/${reportCardId}/${action}`,
        method: "PATCH",
        authenticated: true,
        body: input ?? {},
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grading", "report-card", reportCardId] });
      qc.invalidateQueries({ queryKey: reportCardsQueryKey(homeroomId, academicYearId) });
    },
  });
}
