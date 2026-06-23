"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import type {
  CopyReportTypesForm,
  CopyReportTypesResult,
  EvaluationForm,
  EvaluationUpdateForm,
  GradeEntryForm,
  ReportCardTransitionForm,
  ReportTypeCreateForm,
  ReportTypeUpdateForm,
} from "@/lib/schemas/grading";
import {
  classGradesQueryKey,
  evaluationsQueryKey,
  evaluationTemplatesQueryKey,
  formulaTemplatesQueryKey,
  reportCardsQueryKey,
  reportFormulasQueryKey,
  reportTypesQueryKey,
  unmaterializedCountQueryKey,
  type Evaluation,
  type EvaluationTemplate,
  type Grade,
  type ReportCard,
  type ReportType,
} from "@/lib/query/queries/use-grading";

// ── Evaluation mutations ─────────────────────────────────────────────────────

export function useCreateEvaluation(homeroomId?: string, subjectId?: string, academicYearId?: string, termId?: string) {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: evaluationsQueryKey(homeroomId, subjectId, academicYearId, termId) }),
  });
}

export function useUpdateEvaluation(homeroomId?: string, subjectId?: string, academicYearId?: string, termId?: string) {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: evaluationsQueryKey(homeroomId, subjectId, academicYearId, termId) }),
  });
}

export function useDeleteEvaluation(homeroomId?: string, subjectId?: string, academicYearId?: string, termId?: string) {
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
      qc.invalidateQueries({ queryKey: evaluationsQueryKey(homeroomId, subjectId, academicYearId, termId) });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classGradesQueryKey(homeroomId, subjectId, academicYearId) });
      // Saving a grade recomputes live report scores for the class+subject.
      qc.invalidateQueries({ queryKey: ["grading", "subject-report-scores"] });
    },
  });
}

// ── Report type mutations ────────────────────────────────────────────────────

export function useCreateReportType(academicYearId?: string, termId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReportTypeCreateForm) =>
      apiFetch<ReportType>({
        service: "grading",
        path: "/api/v1/grading/report-types",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportTypesQueryKey(academicYearId, termId) }),
  });
}

export function useUpdateReportType(academicYearId?: string, termId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportTypeId, ...body }: ReportTypeUpdateForm & { reportTypeId: string }) =>
      apiFetch<ReportType>({
        service: "grading",
        path: `/api/v1/grading/report-types/${reportTypeId}`,
        method: "PATCH",
        authenticated: true,
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportTypesQueryKey(academicYearId, termId) }),
  });
}

export function useDeleteReportType(academicYearId?: string, termId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportTypeId: string) =>
      apiFetch<void>({
        service: "grading",
        path: `/api/v1/grading/report-types/${reportTypeId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportTypesQueryKey(academicYearId, termId) }),
  });
}

// ── Report formula mutations ─────────────────────────────────────────────────

export function useCopyReportTypes(academicYearId?: string, targetTermId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CopyReportTypesForm) =>
      apiFetch<CopyReportTypesResult>({
        service: "grading",
        path: "/api/v1/grading/report-types/copy",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportTypesQueryKey(academicYearId, targetTermId) }),
  });
}

export function useUpsertReportFormula(reportTypeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subjectId, weights }: { subjectId: string; weights: Record<string, number> }) =>
      apiFetch<void>({
        service: "grading",
        path: `/api/v1/grading/report-types/${reportTypeId}/formulas/${subjectId}`,
        method: "PUT",
        authenticated: true,
        body: { weights },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportFormulasQueryKey(reportTypeId) });
      // Weight changes affect live report scores.
      qc.invalidateQueries({ queryKey: ["grading", "subject-report-scores"] });
    },
  });
}

// ── Report-card mutations ────────────────────────────────────────────────────

export function useGenerateReportCards(reportTypeId?: string, homeroomId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { report_type_id: string; homeroom_id: string }) =>
      apiFetch<{ generated: ReportCard[]; skipped: string[] }>({
        service: "grading",
        path: "/api/v1/grading/report-cards/generate",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportCardsQueryKey(reportTypeId, homeroomId) }),
  });
}

export function useTransitionReportCard(reportCardId: string, reportTypeId?: string, homeroomId?: string) {
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
      qc.invalidateQueries({ queryKey: reportCardsQueryKey(reportTypeId, homeroomId) });
    },
  });
}

/**
 * Transition many report cards by calling the single-card PATCH endpoint per
 * card (the grading service exposes no bulk endpoint). `action` is fixed per
 * run so the caller picks the right advance for the selected statuses. Returns
 * a per-card result list so the UI can report partial failures.
 */
export function useBulkTransitionReportCards(reportTypeId?: string, homeroomId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportCardIds,
      action,
    }: {
      reportCardIds: string[];
      action: "submit" | "homeroom-approve" | "return" | "principal-approve" | "reject";
    }) => {
      const results = await Promise.allSettled(
        reportCardIds.map((reportCardId) =>
          apiFetch<ReportCard>({
            service: "grading",
            path: `/api/v1/grading/report-cards/${reportCardId}/${action}`,
            method: "PATCH",
            authenticated: true,
            body: {},
          }),
        ),
      );
      return results.map((result, index) => ({
        report_card_id: reportCardIds[index],
        ok: result.status === "fulfilled",
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grading", "report-card"] });
      qc.invalidateQueries({ queryKey: reportCardsQueryKey(reportTypeId, homeroomId) });
    },
  });
}

// ── Evaluation template mutations ────────────────────────────────────────────

export type EvaluationTemplateForm = {
  term_id: string;
  code: string;
  name: string;
  position: number;
};

export type EvaluationTemplateUpdateForm = {
  code?: string;
  name?: string;
  position?: number;
};

export function useCreateEvaluationTemplate(termId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EvaluationTemplateForm) =>
      apiFetch<EvaluationTemplate>({
        service: "grading",
        path: "/api/v1/grading/evaluation-templates",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: evaluationTemplatesQueryKey(termId) }),
  });
}

export function useUpdateEvaluationTemplate(termId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, ...body }: EvaluationTemplateUpdateForm & { templateId: string }) =>
      apiFetch<EvaluationTemplate>({
        service: "grading",
        path: `/api/v1/grading/evaluation-templates/${templateId}`,
        method: "PATCH",
        authenticated: true,
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: evaluationTemplatesQueryKey(termId) }),
  });
}

export function useDeleteEvaluationTemplate(termId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      apiFetch<void>({
        service: "grading",
        path: `/api/v1/grading/evaluation-templates/${templateId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: evaluationTemplatesQueryKey(termId) }),
  });
}

// ── Weight template mutations ────────────────────────────────────────────────

export function useUpsertFormulaTemplate(reportTypeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weights }: { weights: Record<string, number> }) =>
      apiFetch<void>({
        service: "grading",
        path: `/api/v1/grading/report-types/${reportTypeId}/formula-templates`,
        method: "PUT",
        authenticated: true,
        body: { weights },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: formulaTemplatesQueryKey(reportTypeId) }),
  });
}

// ── Apply (backfill) mutation ────────────────────────────────────────────────

export type ApplyTermTemplateResult = {
  evaluations_created: number;
  weights_created: number;
};

export function useApplyTermTemplate(termId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ApplyTermTemplateResult>({
        service: "grading",
        path: "/api/v1/grading/evaluation-templates/apply",
        method: "POST",
        authenticated: true,
        body: { term_id: termId },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: unmaterializedCountQueryKey(termId) }),
  });
}
