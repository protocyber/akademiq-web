"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import {
  ACADEMIC_YEARS_QUERY_KEY,
  ACADEMIC_TERMS_QUERY_KEY,
  AcademicYear,
  AcademicTerm,
  ClassTemplate,
  CLASS_TEMPLATES_QUERY_KEY,
  CurriculumVersion,
  CURRICULUM_VERSIONS_QUERY_KEY,
  GradingPolicy,
  Subject,
  SUBJECTS_QUERY_KEY,
} from "@/lib/query/queries/use-academic-config";
import type { AcademicYearForm, TransitionRequestForm } from "@/lib/schemas/academic-year";
import type { AcademicTermForm, TermTransitionRequestForm } from "@/lib/schemas/academic-term";
import type { ClassTemplateForm } from "@/lib/schemas/class-template";
import type { GradingPolicyForm } from "@/lib/schemas/grading-policy";
import type { CurriculumVersionForm, SubjectForm } from "@/lib/schemas/subject";

// ---------------------------------------------------------------------------
// Academic years
// ---------------------------------------------------------------------------

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
    mutationFn: (input: TransitionRequestForm) =>
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

export function useDeleteAcademicYear() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (academicYearId) =>
      apiFetch<void>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACADEMIC_YEARS_QUERY_KEY }),
  });
}

export function useBulkDeleteAcademicYears() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string[]>({
    mutationFn: (ids) =>
      apiFetch<void>({
        service: "academic-config",
        path: "/api/v1/academic-config/academic-years/bulk/delete",
        method: "POST",
        authenticated: true,
        body: { ids },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACADEMIC_YEARS_QUERY_KEY }),
  });
}

// ---------------------------------------------------------------------------
// Academic terms
// ---------------------------------------------------------------------------

export function useCreateAcademicTerm(yearId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AcademicTermForm) =>
      apiFetch<AcademicTerm>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${yearId}/terms`,
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...ACADEMIC_TERMS_QUERY_KEY, yearId] }),
  });
}

export function useUpdateAcademicTerm(termId: string, yearId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AcademicTermForm) =>
      apiFetch<AcademicTerm>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-terms/${termId}`,
        method: "PATCH",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...ACADEMIC_TERMS_QUERY_KEY, yearId] }),
  });
}

export function useTransitionAcademicTerm(termId: string, yearId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TermTransitionRequestForm) =>
      apiFetch<AcademicTerm>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-terms/${termId}/status`,
        method: "PATCH",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ACADEMIC_TERMS_QUERY_KEY, yearId] });
      qc.invalidateQueries({ queryKey: ACADEMIC_YEARS_QUERY_KEY });
    },
  });
}

export function useDeleteAcademicTerm(yearId: string) {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (termId) =>
      apiFetch<void>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-terms/${termId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...ACADEMIC_TERMS_QUERY_KEY, yearId] }),
  });
}

// ---------------------------------------------------------------------------
// Curriculum versions
// ---------------------------------------------------------------------------

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
    onSuccess: () => qc.invalidateQueries({ queryKey: CURRICULUM_VERSIONS_QUERY_KEY }),
  });
}

export function useUpdateCurriculumVersion(curriculumVersionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CurriculumVersionForm) =>
      apiFetch<CurriculumVersion>({
        service: "academic-config",
        path: `/api/v1/academic-config/curriculum-versions/${curriculumVersionId}`,
        method: "PATCH",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CURRICULUM_VERSIONS_QUERY_KEY }),
  });
}

export function useDeleteCurriculumVersion() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (curriculumVersionId) =>
      apiFetch<void>({
        service: "academic-config",
        path: `/api/v1/academic-config/curriculum-versions/${curriculumVersionId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CURRICULUM_VERSIONS_QUERY_KEY }),
  });
}

export function useBulkDeleteCurriculumVersions() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string[]>({
    mutationFn: (ids) =>
      apiFetch<void>({
        service: "academic-config",
        path: "/api/v1/academic-config/curriculum-versions/bulk/delete",
        method: "POST",
        authenticated: true,
        body: { ids },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CURRICULUM_VERSIONS_QUERY_KEY }),
  });
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

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
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY }),
  });
}

export function useUpdateSubject(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<SubjectForm, "curriculum_version_id">) =>
      apiFetch<Subject>({
        service: "academic-config",
        path: `/api/v1/academic-config/subjects/${subjectId}`,
        method: "PATCH",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (subjectId) =>
      apiFetch<void>({
        service: "academic-config",
        path: `/api/v1/academic-config/subjects/${subjectId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY }),
  });
}

export function useBulkDeleteSubjects() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string[]>({
    mutationFn: (ids) =>
      apiFetch<void>({
        service: "academic-config",
        path: "/api/v1/academic-config/subjects/bulk/delete",
        method: "POST",
        authenticated: true,
        body: { ids },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY }),
  });
}

// ---------------------------------------------------------------------------
// Grading policy
// ---------------------------------------------------------------------------

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
      await qc.invalidateQueries({
        queryKey: ["academic-config", "grading-policy", academicYearId],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Class templates
// ---------------------------------------------------------------------------

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
    onSuccess: () => qc.invalidateQueries({ queryKey: CLASS_TEMPLATES_QUERY_KEY }),
  });
}

export function useUpdateClassTemplate(templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ClassTemplateForm, "academic_year_id">) =>
      apiFetch<ClassTemplate>({
        service: "academic-config",
        path: `/api/v1/academic-config/class-templates/${templateId}`,
        method: "PATCH",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLASS_TEMPLATES_QUERY_KEY }),
  });
}

export function useDeleteClassTemplate() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (templateId) =>
      apiFetch<void>({
        service: "academic-config",
        path: `/api/v1/academic-config/class-templates/${templateId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLASS_TEMPLATES_QUERY_KEY }),
  });
}

export function useBulkDeleteClassTemplates() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string[]>({
    mutationFn: (ids) =>
      apiFetch<void>({
        service: "academic-config",
        path: "/api/v1/academic-config/class-templates/bulk/delete",
        method: "POST",
        authenticated: true,
        body: { ids },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLASS_TEMPLATES_QUERY_KEY }),
  });
}
