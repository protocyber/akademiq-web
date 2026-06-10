"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type Grade = {
  grade_id: string;
  student_id: string;
  subject_id: string;
  academic_year_id: string;
  homeroom_id: string;
  score: number;
  recorded_by: string;
};

export const classGradesQueryKey = (homeroomId?: string, subjectId?: string, academicYearId?: string) =>
  ["grading", "class-grades", homeroomId, subjectId, academicYearId] as const;

export function useClassGrades(homeroomId?: string, subjectId?: string, academicYearId?: string) {
  return useQuery({
    queryKey: classGradesQueryKey(homeroomId, subjectId, academicYearId),
    queryFn: () =>
      apiFetch<Grade[]>({
        service: "grading",
        path: `/api/v1/grading/grades?homeroom_id=${homeroomId}&subject_id=${subjectId}&academic_year_id=${academicYearId}`,
        authenticated: true,
      }),
    enabled: Boolean(homeroomId && subjectId && academicYearId),
  });
}

export function useStudentGrades(studentId?: string, academicYearId?: string) {
  return useQuery({
    queryKey: ["grading", "student-grades", studentId, academicYearId],
    queryFn: () =>
      apiFetch<Grade[]>({
        service: "grading",
        path: `/api/v1/grading/students/${studentId}/grades?academic_year_id=${academicYearId}`,
        authenticated: true,
      }),
    enabled: Boolean(studentId && academicYearId),
  });
}
