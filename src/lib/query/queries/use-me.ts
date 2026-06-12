"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type Membership = {
  tenant_id: string;
  role_code: string;
};

export type MeView = {
  user_id: string;
  username: string;
  email: string | null;
  email_verified: boolean;
  full_name: string;
  status: string;
  memberships: Membership[];
};

export const ME_QUERY_KEY = ["iam", "me"] as const;

/**
 * Fetch the current user's profile. Works with both identity tokens and
 * access tokens since `/me` accepts both. Pass `enabled=false` to skip
 * the query when no token is present.
 */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () =>
      apiFetch<MeView>({
        service: "iam",
        path: "/api/v1/iam/me",
        // Use identity token for /me since it works with either token type.
        // The server accepts both; identity token is always present after login.
        identityAuthenticated: true,
      }),
    enabled,
  });
}
