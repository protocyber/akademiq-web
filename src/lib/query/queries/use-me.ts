"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type Membership = {
  tenant_id: string;
  role_code: string;
};

export type MeView = {
  user_id: string;
  email: string;
  full_name: string;
  status: string;
  memberships: Membership[];
};

export const ME_QUERY_KEY = ["iam", "me"] as const;

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () =>
      apiFetch<MeView>({
        service: "iam",
        path: "/api/v1/iam/me",
        authenticated: true,
      }),
    enabled,
  });
}
