"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import type { SchoolProfileForm } from "@/lib/schemas/academic-ops";
import { SCHOOL_PROFILE_QUERY_KEY, type SchoolProfile } from "@/lib/query/queries/use-school-profile";

export function useUpdateSchoolProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SchoolProfileForm>) =>
      apiFetch<SchoolProfile>({
        service: "billing",
        path: "/api/v1/billing/tenants/me/school-profile",
        method: "PATCH",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHOOL_PROFILE_QUERY_KEY }),
  });
}
