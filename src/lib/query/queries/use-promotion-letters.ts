"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { PROMOTION_QUERY_KEY, type PromotionCounts, type PromotionResult } from "@/lib/query/queries/use-promotion";

const BASE = "/api/v1/academic-ops/promotion-runs";

export type Letterhead = {
  tenant_id: string;
  school_name: string;
  npsn: string | null;
  principal_name: string | null;
  principal_nip: string | null;
  address_line: string | null;
  village: string | null;
  subdistrict: string | null;
  city_regency: string | null;
  province: string | null;
  postal_code: string | null;
  phone_number: string | null;
  email: string | null;
  logo_url: string | null;
  updated_at: string;
};

export type ClassLetter = {
  homeroom_id: string;
  letter_number: string;
  letter_date: string;
  city: string;
  school_name: string;
  principal_name: string;
  principal_nip: string | null;
  issued_by: string;
  issued_at: string;
  updated_by: string;
  updated_at: string;
};

export type ClassLetterSummary = {
  homeroom_id: string;
  homeroom_name: string | null;
  counts: PromotionCounts;
  letter: ClassLetter | null;
};

export type LettersSummary = {
  school_profile: Letterhead | null;
  class_letters: ClassLetterSummary[];
  certificates: { graduates: number; issued: number };
};

export type ClassLetterStudent = {
  student_id: string;
  full_name: string | null;
  nis: string | null;
  nisn: string | null;
  result: PromotionResult;
  target_homeroom_name: string | null;
};

export type ClassLetterPrint = {
  letterhead: Letterhead | null;
  source_year_name: string | null;
  target_year_name: string | null;
  homeroom_id: string;
  homeroom_name: string | null;
  letter: ClassLetter | null;
  students: ClassLetterStudent[];
};

export type Certificate = {
  student_id: string;
  full_name: string | null;
  nis: string | null;
  nisn: string | null;
  birth_place: string | null;
  birth_date: string | null;
  last_homeroom_name: string | null;
  graduation_date: string;
  certificate_number: string | null;
  letter_date: string | null;
  city: string | null;
  school_name: string | null;
  principal_name: string | null;
  principal_nip: string | null;
  issued_at: string | null;
  updated_at: string | null;
};

export type CertificatesPrint = {
  letterhead: Letterhead | null;
  source_year_name: string | null;
  certificates: Certificate[];
};

export function usePromotionLetters(runId?: string) {
  return useQuery({
    queryKey: [...PROMOTION_QUERY_KEY, "letters", runId],
    queryFn: () => apiFetch<LettersSummary>({ service: "academic-ops", path: `${BASE}/${runId}/letters`, authenticated: true }),
    enabled: Boolean(runId),
  });
}

export function useClassLetterPrint(runId?: string, homeroomId?: string) {
  return useQuery({
    queryKey: [...PROMOTION_QUERY_KEY, "class-letter", runId, homeroomId],
    queryFn: () =>
      apiFetch<ClassLetterPrint>({
        service: "academic-ops",
        path: `${BASE}/${runId}/class-letters/${homeroomId}`,
        authenticated: true,
      }),
    enabled: Boolean(runId && homeroomId),
  });
}

export function useCertificatesPrint(runId?: string, studentId?: string) {
  const query = studentId ? `?student_id=${encodeURIComponent(studentId)}` : "";
  return useQuery({
    queryKey: [...PROMOTION_QUERY_KEY, "certificates", runId, studentId ?? null],
    queryFn: () =>
      apiFetch<CertificatesPrint>({
        service: "academic-ops",
        path: `${BASE}/${runId}/certificates${query}`,
        authenticated: true,
      }),
    enabled: Boolean(runId),
  });
}
