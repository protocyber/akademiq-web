"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type AcademicYear = {
  academic_year_id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

export type CurriculumVersion = {
  curriculum_version_id: string;
  tenant_id: string;
  academic_year_id: string;
  name: string;
  description?: string | null;
};

export type Subject = {
  subject_id: string;
  tenant_id: string;
  curriculum_version_id: string;
  name: string;
  code?: string | null;
  passing_grade: number;
};

export type GradingPolicy = {
  policy_id: string;
  tenant_id: string;
  academic_year_id: string;
  minimum_passing_score: number;
  grading_scale: string;
};

export type ClassTemplate = {
  template_id: string;
  tenant_id: string;
  academic_year_id: string;
  grade_level: string;
  default_capacity: number;
};

export const ACADEMIC_YEARS_QUERY_KEY = ["academic-config", "academic-years"] as const;

export function useAcademicYears() {
  return useQuery({
    queryKey: ACADEMIC_YEARS_QUERY_KEY,
    queryFn: () =>
      apiFetch<AcademicYear[]>({
        service: "academic-config",
        path: "/api/v1/academic-config/academic-years",
        authenticated: true,
      }),
  });
}

export function useCurriculumVersions(academicYearId?: string) {
  return useQuery({
    queryKey: ["academic-config", "curriculum-versions", academicYearId],
    queryFn: () =>
      apiFetch<CurriculumVersion[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}/curriculum-versions`,
        authenticated: true,
      }),
    enabled: Boolean(academicYearId),
  });
}

export function useSubjects(curriculumVersionId?: string) {
  return useQuery({
    queryKey: ["academic-config", "subjects", curriculumVersionId],
    queryFn: () =>
      apiFetch<Subject[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/curriculum-versions/${curriculumVersionId}/subjects`,
        authenticated: true,
      }),
    enabled: Boolean(curriculumVersionId),
  });
}

export function useGradingPolicy(academicYearId?: string) {
  return useQuery({
    queryKey: ["academic-config", "grading-policy", academicYearId],
    queryFn: () =>
      apiFetch<GradingPolicy>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}/grading-policy`,
        authenticated: true,
      }),
    enabled: Boolean(academicYearId),
    retry: false,
  });
}

export function useClassTemplates(academicYearId?: string) {
  return useQuery({
    queryKey: ["academic-config", "class-templates", academicYearId],
    queryFn: () =>
      apiFetch<ClassTemplate[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}/class-templates`,
        authenticated: true,
      }),
    enabled: Boolean(academicYearId),
  });
}
