"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import type { GradeEntryForm } from "@/lib/schemas/grading";
import { classGradesQueryKey, type Grade } from "@/lib/query/queries/use-grading";

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
