"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import type { SchoolProfileForm } from "@/lib/schemas/academic-ops";
import { SCHOOL_MEDIA_QUERY_KEY, SCHOOL_PROFILE_QUERY_KEY, type SchoolProfile } from "@/lib/query/queries/use-school-profile";

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

export function useDeleteSchoolLogoMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) =>
      apiFetch<void>({
        service: "billing",
        path: `/api/v1/billing/tenants/me/school-profile/media/${mediaId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCHOOL_PROFILE_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SCHOOL_MEDIA_QUERY_KEY });
    },
  });
}
