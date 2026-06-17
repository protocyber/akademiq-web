"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch, apiFetchEnvelope } from "@/lib/api/client";
import {
  academicClassTemplatesParamsKey,
  type AcademicClassTemplatesParams,
} from "@/lib/schemas/academic-class-templates-params";
import {
  academicSubjectsParamsKey,
  type AcademicSubjectsParams,
} from "@/lib/schemas/academic-subjects-params";
import {
  academicYearsParamsKey,
  type AcademicYearsParams,
} from "@/lib/schemas/academic-years-params";

export type AcademicYear = {
  academic_year_id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

export type AcademicTerm = {
  term_id: string;
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

export type PageMeta = {
  page: number;
  page_size: number;
  total: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PageMeta;
};

export const ACADEMIC_YEARS_QUERY_KEY = ["academic-config", "academic-years"] as const;
export const ACADEMIC_TERMS_QUERY_KEY = ["academic-config", "academic-terms"] as const;
export const CURRICULUM_VERSIONS_QUERY_KEY = [
  "academic-config",
  "curriculum-versions",
] as const;
export const SUBJECTS_QUERY_KEY = ["academic-config", "subjects"] as const;
export const CLASS_TEMPLATES_QUERY_KEY = ["academic-config", "class-templates"] as const;

function buildQuery(serialized: string) {
  return serialized ? `?${serialized}` : "";
}

function listParamsQuery(params: {
  search?: string;
  page: number;
  page_size: number;
  sort: string;
}) {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  sp.set("page", String(params.page));
  sp.set("page_size", String(params.page_size));
  sp.set("sort", params.sort);
  return sp.toString();
}

/**
 * Paginated, server-driven academic years for the data table.
 */
export function useAcademicYearsTable(params: AcademicYearsParams) {
  return useQuery({
    queryKey: [...ACADEMIC_YEARS_QUERY_KEY, ...academicYearsParamsKey(params)],
    queryFn: async () => {
      const envelope = await apiFetchEnvelope<AcademicYear[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years${buildQuery(listParamsQuery(params))}`,
        authenticated: true,
      });
      return { data: envelope.data, meta: envelope.meta as PageMeta };
    },
  });
}

/**
 * Unpaginated academic years for dropdowns/pickers (first 100 by name).
 */
export function useAcademicYears() {
  const query = useAcademicYearsTable({ page: 1, page_size: 100, sort: "name" });
  return { ...query, data: query.data?.data };
}

export function useTerms(yearId?: string) {
  return useQuery({
    queryKey: [...ACADEMIC_TERMS_QUERY_KEY, yearId ?? ""],
    queryFn: async () => {
      const envelope = await apiFetchEnvelope<AcademicTerm[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${yearId}/terms?page=1&page_size=100&sort=start_date`,
        authenticated: true,
      });
      return envelope.data;
    },
    enabled: Boolean(yearId),
  });
}

export function useCurriculumVersions(academicYearId?: string) {
  return useQuery({
    queryKey: [...CURRICULUM_VERSIONS_QUERY_KEY, academicYearId ?? ""],
    queryFn: async () => {
      const envelope = await apiFetchEnvelope<CurriculumVersion[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}/curriculum-versions?page=1&page_size=100&sort=name`,
        authenticated: true,
      });
      return envelope.data;
    },
    enabled: Boolean(academicYearId),
  });
}

export function useSubjectsTable(params: AcademicSubjectsParams) {
  return useQuery({
    queryKey: [...SUBJECTS_QUERY_KEY, ...academicSubjectsParamsKey(params)],
    queryFn: async () => {
      const envelope = await apiFetchEnvelope<Subject[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/curriculum-versions/${params.curriculum_version_id}/subjects${buildQuery(
          listParamsQuery(params),
        )}`,
        authenticated: true,
      });
      return { data: envelope.data, meta: envelope.meta as PageMeta };
    },
    enabled: Boolean(params.curriculum_version_id),
  });
}

/**
 * Unpaginated subjects for dropdowns/consumers (first 100 by name).
 */
export function useSubjects(curriculumVersionId?: string) {
  return useQuery({
    queryKey: [...SUBJECTS_QUERY_KEY, "all", curriculumVersionId ?? ""],
    queryFn: async () => {
      const envelope = await apiFetchEnvelope<Subject[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/curriculum-versions/${curriculumVersionId}/subjects?page=1&page_size=100&sort=name`,
        authenticated: true,
      });
      return envelope.data;
    },
    enabled: Boolean(curriculumVersionId),
  });
}

/**
 * All subjects across every curriculum version of an academic year — used to
 * resolve subject names in a table whose rows can reference subjects from any
 * curriculum. (Subjects are nested under curriculum versions, so a tenant-wide
 * list does not exist.)
 */
export function useSubjectsForYear(academicYearId?: string) {
  return useQuery({
    queryKey: [...SUBJECTS_QUERY_KEY, "for-year", academicYearId ?? ""],
    enabled: Boolean(academicYearId),
    queryFn: async () => {
      const curricula = await apiFetchEnvelope<CurriculumVersion[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}/curriculum-versions?page=1&page_size=100&sort=name`,
        authenticated: true,
      });
      const perCurriculum = await Promise.all(
        curricula.data.map((c) =>
          apiFetchEnvelope<Subject[]>({
            service: "academic-config",
            path: `/api/v1/academic-config/curriculum-versions/${c.curriculum_version_id}/subjects?page=1&page_size=100&sort=name`,
            authenticated: true,
          }),
        ),
      );
      return perCurriculum.flatMap((envelope) => envelope.data);
    },
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

export function useClassTemplatesTable(params: AcademicClassTemplatesParams) {
  return useQuery({
    queryKey: [...CLASS_TEMPLATES_QUERY_KEY, ...academicClassTemplatesParamsKey(params)],
    queryFn: async () => {
      const envelope = await apiFetchEnvelope<ClassTemplate[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${params.academic_year_id}/class-templates${buildQuery(
          listParamsQuery(params),
        )}`,
        authenticated: true,
      });
      return { data: envelope.data, meta: envelope.meta as PageMeta };
    },
    enabled: Boolean(params.academic_year_id),
  });
}

/**
 * Unpaginated class templates for dropdowns/consumers (first 100).
 */
export function useClassTemplates(academicYearId?: string) {
  return useQuery({
    queryKey: [...CLASS_TEMPLATES_QUERY_KEY, "all", academicYearId ?? ""],
    queryFn: async () => {
      const envelope = await apiFetchEnvelope<ClassTemplate[]>({
        service: "academic-config",
        path: `/api/v1/academic-config/academic-years/${academicYearId}/class-templates?page=1&page_size=100&sort=grade_level`,
        authenticated: true,
      });
      return envelope.data;
    },
    enabled: Boolean(academicYearId),
  });
}
