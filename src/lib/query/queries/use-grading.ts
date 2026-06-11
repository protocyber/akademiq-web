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

export type ReportCardStatus = "Draft" | "HomeroomReview" | "PrincipalApproval" | "Published" | "Archived";

export type ReportCard = {
  report_card_id: string;
  student_id: string;
  academic_year_id: string;
  homeroom_id: string;
  status: ReportCardStatus;
  summary: {
    subjects?: Array<{ subject_id: string; score: number; passed: boolean }>;
    average_score?: number | null;
    pass_count?: number;
    total_subjects?: number;
    incomplete?: boolean;
  };
  published_at?: string | null;
};

export type ReportApproval = {
  approval_id: string;
  report_card_id: string;
  approver_id: string;
  role: string;
  action: string;
  note?: string | null;
  approved_at: string;
};

export type ReportCardDetail = {
  report_card: ReportCard;
  grades: Grade[];
  approvals: ReportApproval[];
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

export const reportCardsQueryKey = (homeroomId?: string, academicYearId?: string) =>
  ["grading", "report-cards", homeroomId, academicYearId] as const;

export function useReportCards(homeroomId?: string, academicYearId?: string) {
  return useQuery({
    queryKey: reportCardsQueryKey(homeroomId, academicYearId),
    queryFn: () =>
      apiFetch<ReportCard[]>({
        service: "grading",
        path: `/api/v1/grading/report-cards?homeroom_id=${homeroomId}&academic_year_id=${academicYearId}`,
        authenticated: true,
      }),
    enabled: Boolean(homeroomId && academicYearId),
  });
}

export function useReportCardDetail(reportCardId?: string) {
  return useQuery({
    queryKey: ["grading", "report-card", reportCardId],
    queryFn: () =>
      apiFetch<ReportCardDetail>({
        service: "grading",
        path: `/api/v1/grading/report-cards/${reportCardId}`,
        authenticated: true,
      }),
    enabled: Boolean(reportCardId),
  });
}

export function usePublishedReportCard(studentId?: string, academicYearId?: string) {
  return useQuery({
    queryKey: ["grading", "published-report-card", studentId, academicYearId],
    queryFn: () =>
      apiFetch<ReportCardDetail>({
        service: "grading",
        path: `/api/v1/grading/students/${studentId}/report-card?academic_year_id=${academicYearId}`,
        authenticated: true,
      }),
    enabled: Boolean(studentId && academicYearId),
  });
}
