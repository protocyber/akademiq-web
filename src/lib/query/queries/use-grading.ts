"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type Evaluation = {
  evaluation_id: string;
  tenant_id: string;
  homeroom_id: string;
  subject_id: string;
  academic_year_id: string;
  code: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Grade = {
  grade_id: string;
  tenant_id: string;
  student_id: string;
  evaluation_id: string;
  score: number;
  recorded_by: string;
  created_at: string;
  updated_at: string;
};

export type ReportCardStatus = "Draft" | "HomeroomReview" | "PrincipalApproval" | "Published" | "Archived";

export type ReportCard = {
  report_card_id: string;
  student_id: string;
  academic_year_id: string;
  homeroom_id: string;
  report_type_id: string;
  status: ReportCardStatus;
  summary: {
    subjects?: Array<{ subject_id: string; final_score: number; passed: boolean }>;
    average_score?: number | null;
    pass_count?: number;
    total_subjects?: number;
    incomplete?: boolean;
  };
  weights_snapshot?: Record<string, Record<string, number>>;
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

export type ReportSubjectScore = {
  report_card_id: string;
  subject_id: string;
  final_score: number;
  computed_at: string;
};

export type ReportCardDetail = {
  report_card: ReportCard;
  grades: Grade[];
  subject_scores: ReportSubjectScore[];
  approvals: ReportApproval[];
};

export type ReportType = {
  report_type_id: string;
  tenant_id: string;
  academic_year_id: string;
  code: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ReportFormula = {
  report_type_id: string;
  evaluation_id: string;
  weight: number;
  updated_at: string;
};

export type SubjectReportScore = {
  tenant_id: string;
  academic_year_id: string;
  homeroom_id: string;
  subject_id: string;
  student_id: string;
  report_type_id: string;
  score: number;
  updated_at: string;
};

// ── Evaluation queries ───────────────────────────────────────────────────────

export const evaluationsQueryKey = (homeroomId?: string, subjectId?: string, academicYearId?: string) =>
  ["grading", "evaluations", homeroomId, subjectId, academicYearId] as const;

export function useEvaluations(homeroomId?: string, subjectId?: string, academicYearId?: string) {
  return useQuery({
    queryKey: evaluationsQueryKey(homeroomId, subjectId, academicYearId),
    queryFn: () =>
      apiFetch<Evaluation[]>({
        service: "grading",
        path: `/api/v1/grading/evaluations?homeroom_id=${homeroomId}&subject_id=${subjectId}&academic_year_id=${academicYearId}`,
        authenticated: true,
      }),
    enabled: Boolean(homeroomId && subjectId && academicYearId),
  });
}

// ── Grade queries ────────────────────────────────────────────────────────────

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

// ── Report-card queries ──────────────────────────────────────────────────────

export const reportCardsQueryKey = (reportTypeId?: string, homeroomId?: string) =>
  ["grading", "report-cards", reportTypeId, homeroomId] as const;

export function useReportCards(reportTypeId?: string, homeroomId?: string) {
  return useQuery({
    queryKey: reportCardsQueryKey(reportTypeId, homeroomId),
    queryFn: () =>
      apiFetch<ReportCard[]>({
        service: "grading",
        path: `/api/v1/grading/report-cards?report_type_id=${reportTypeId}&homeroom_id=${homeroomId}`,
        authenticated: true,
      }),
    enabled: Boolean(reportTypeId && homeroomId),
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

export function useMyReportCards(academicYearId?: string) {
  return useQuery({
    queryKey: ["grading", "my-report-cards", academicYearId],
    queryFn: () =>
      apiFetch<ReportCard[]>({
        service: "grading",
        path: `/api/v1/grading/me/report-cards?academic_year_id=${academicYearId}`,
        authenticated: true,
      }),
    enabled: Boolean(academicYearId),
  });
}

export function useMyReportCardDetail(studentId?: string, academicYearId?: string) {
  return useQuery({
    queryKey: ["grading", "my-report-card-detail", studentId, academicYearId],
    queryFn: () =>
      apiFetch<ReportCardDetail>({
        service: "grading",
        path: `/api/v1/grading/me/report-cards/${studentId}?academic_year_id=${academicYearId}`,
        authenticated: true,
      }),
    enabled: Boolean(studentId && academicYearId),
  });
}

// ── Report type queries ──────────────────────────────────────────────────────

export const reportTypesQueryKey = (academicYearId?: string) =>
  ["grading", "report-types", academicYearId] as const;

export function useReportTypes(academicYearId?: string) {
  return useQuery({
    queryKey: reportTypesQueryKey(academicYearId),
    queryFn: () =>
      apiFetch<ReportType[]>({
        service: "grading",
        path: `/api/v1/grading/report-types?academic_year_id=${academicYearId}`,
        authenticated: true,
      }),
    enabled: Boolean(academicYearId),
  });
}

// ── Report formula queries ───────────────────────────────────────────────────

export const reportFormulasQueryKey = (reportTypeId?: string) =>
  ["grading", "report-formulas", reportTypeId] as const;

export function useReportFormulas(reportTypeId?: string) {
  return useQuery({
    queryKey: reportFormulasQueryKey(reportTypeId),
    queryFn: () =>
      apiFetch<ReportFormula[]>({
        service: "grading",
        path: `/api/v1/grading/report-types/${reportTypeId}/formulas`,
        authenticated: true,
      }),
    enabled: Boolean(reportTypeId),
  });
}

/**
 * Formula weight rows for several report types, keyed by `report_type_id`. Used
 * by the Kelola Evaluasi weight matrix. Shares the `report-formulas` key prefix.
 */
export function useReportFormulasForTypes(reportTypeIds: string[]) {
  return useQuery({
    queryKey: ["grading", "report-formulas", "multi", reportTypeIds.join(",")] as const,
    queryFn: async () => {
      const entries = await Promise.all(
        reportTypeIds.map(async (reportTypeId) => {
          const rows = await apiFetch<ReportFormula[]>({
            service: "grading",
            path: `/api/v1/grading/report-types/${reportTypeId}/formulas`,
            authenticated: true,
          });
          return [reportTypeId, rows] as const;
        }),
      );
      return new Map<string, ReportFormula[]>(entries);
    },
    enabled: reportTypeIds.length > 0,
  });
}

// ── Subject report score queries (live grid columns) ─────────────────────────

export const subjectReportScoresQueryKey = (reportTypeId?: string, homeroomId?: string, subjectId?: string) =>
  ["grading", "subject-report-scores", reportTypeId, homeroomId, subjectId] as const;

export function useSubjectReportScores(reportTypeId?: string, homeroomId?: string, subjectId?: string) {
  return useQuery({
    queryKey: subjectReportScoresQueryKey(reportTypeId, homeroomId, subjectId),
    queryFn: () =>
      apiFetch<SubjectReportScore[]>({
        service: "grading",
        path: `/api/v1/grading/subject-report-scores?report_type_id=${reportTypeId}&homeroom_id=${homeroomId}&subject_id=${subjectId}`,
        authenticated: true,
      }),
    enabled: Boolean(reportTypeId && homeroomId && subjectId),
  });
}

/**
 * Live report scores for several report types at once (the year's types), keyed
 * by `report_type_id`. Used to render the N read-only grade-entry columns. Shares
 * the `subject-report-scores` key prefix so a grade save refreshes it.
 */
export function useSubjectReportScoresForTypes(reportTypeIds: string[], homeroomId?: string, subjectId?: string) {
  return useQuery({
    queryKey: ["grading", "subject-report-scores", "multi", reportTypeIds.join(","), homeroomId, subjectId] as const,
    queryFn: async () => {
      const entries = await Promise.all(
        reportTypeIds.map(async (reportTypeId) => {
          const rows = await apiFetch<SubjectReportScore[]>({
            service: "grading",
            path: `/api/v1/grading/subject-report-scores?report_type_id=${reportTypeId}&homeroom_id=${homeroomId}&subject_id=${subjectId}`,
            authenticated: true,
          });
          return [reportTypeId, rows] as const;
        }),
      );
      return new Map<string, SubjectReportScore[]>(entries);
    },
    enabled: Boolean(homeroomId && subjectId && reportTypeIds.length > 0),
  });
}
