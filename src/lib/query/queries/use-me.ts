"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch, getAccessToken } from "@/lib/api/client";

export type Membership = {
  tenant_id: string;
  roles: string[];
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
 * Fetch the current user's profile. The backend `/me` accepts either an
 * identity token or a tenant-scoped access token.
 *
 * Once the user has entered a tenant (a scoped access token exists), we send
 * the request via the `authenticated` path so an expired-token 401 triggers
 * the client's silent refresh (the access token is renewable for 7 days via
 * the refresh token). Before tenant entry only the short-lived identity token
 * exists, so we fall back to `identityAuthenticated`.
 *
 * Pass `enabled=false` to skip the query when no token is present.
 */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () =>
      apiFetch<MeView>(
        getAccessToken()
          ? { service: "iam", path: "/api/v1/iam/me", authenticated: true }
          : { service: "iam", path: "/api/v1/iam/me", identityAuthenticated: true },
      ),
    enabled,
  });
}
