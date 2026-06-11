"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import type { GradeEntryForm, ReportCardGenerateForm, ReportCardTransitionForm } from "@/lib/schemas/grading";
import { classGradesQueryKey, reportCardsQueryKey, type Grade, type ReportCard } from "@/lib/query/queries/use-grading";

export function useRecordGrade(homeroomId?: string) {
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
    onSuccess: (_grade, input) => qc.invalidateQueries({ queryKey: classGradesQueryKey(homeroomId, input.subject_id, input.academic_year_id) }),
  });
}

export function useUpdateGrade(homeroomId?: string, subjectId?: string, academicYearId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gradeId, score }: { gradeId: string; score: number }) =>
      apiFetch<Grade>({
        service: "grading",
        path: `/api/v1/grading/grades/${gradeId}`,
        method: "PATCH",
        authenticated: true,
        body: { score },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: classGradesQueryKey(homeroomId, subjectId, academicYearId) }),
  });
}

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
