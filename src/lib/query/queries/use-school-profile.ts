"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type SchoolProfile = {
  tenant_id: string;
  school_name: string;
  phone_number?: string | null;
  email?: string | null;
  website?: string | null;
  npsn?: string | null;
  logo_url?: string | null;
  school_level?: string | null;
  school_status?: string | null;
  accreditation?: string | null;
  address_line?: string | null;
  village?: string | null;
  subdistrict?: string | null;
  city_regency?: string | null;
  province?: string | null;
  postal_code?: string | null;
};

export const SCHOOL_PROFILE_QUERY_KEY = ["billing", "school-profile"] as const;

export function useSchoolProfile() {
  return useQuery({
    queryKey: SCHOOL_PROFILE_QUERY_KEY,
    queryFn: () =>
      apiFetch<SchoolProfile>({
        service: "billing",
        path: "/api/v1/billing/tenants/me/school-profile",
        authenticated: true,
      }),
  });
}
