"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import {
  ACADEMIC_YEARS_QUERY_KEY,
  AcademicYear,
  ClassTemplate,
  CurriculumVersion,
  GradingPolicy,
  Subject,
} from "@/lib/query/queries/use-academic-config";
import type { AcademicYearForm, YearStatusForm } from "@/lib/schemas/academic-year";
import type { ClassTemplateForm } from "@/lib/schemas/class-template";
import type { GradingPolicyForm } from "@/lib/schemas/grading-policy";
import type { CurriculumVersionForm, SubjectForm } from "@/lib/schemas/subject";

export function useCreateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AcademicYearForm) =>
      apiFetch<AcademicYear>({
        service: "academic-config",
        path: "/api/v1/academic-config/academic-years",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACADEMIC_YEARS_QUERY_KEY }),
  });
}

export function useTransitionAcademicYear(academicYearId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: YearStatusForm) =>
      apiFetch<AcademicYear>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}/status`,
        method: "PATCH",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACADEMIC_YEARS_QUERY_KEY }),
  });
}

export function useAddCurriculumVersion(academicYearId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CurriculumVersionForm) =>
      apiFetch<CurriculumVersion>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}/curriculum-versions`,
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["academic-config", "curriculum-versions", academicYearId] });
    },
  });
}

export function useAddSubject(curriculumVersionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<SubjectForm, "curriculum_version_id">) =>
      apiFetch<Subject>({
        service: "academic-config",
        path: `/api/v1/academic-config/curriculum-versions/${curriculumVersionId}/subjects`,
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["academic-config", "subjects", curriculumVersionId] });
    },
  });
}

export function useUpsertGradingPolicy(academicYearId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<GradingPolicyForm, "academic_year_id">) =>
      apiFetch<GradingPolicy>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}/grading-policy`,
        method: "PUT",
        authenticated: true,
        body: input,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["academic-config", "grading-policy", academicYearId] });
    },
  });
}

export function useAddClassTemplate(academicYearId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ClassTemplateForm, "academic_year_id">) =>
      apiFetch<ClassTemplate>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}/class-templates`,
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["academic-config", "class-templates", academicYearId] });
    },
  });
}
