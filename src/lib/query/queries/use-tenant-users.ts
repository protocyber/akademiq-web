"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type TenantInvitation = {
  invitation_id: string;
  tenant_id: string;
  email: string;
  roles: string[];
  status: string;
  expires_at: string;
  invited_by: string;
  accepted_at: string | null;
  created_at: string;
};

export type TenantUser = {
  user_id: string;
  tenant_id: string;
  username: string;
  email: string | null;
  full_name: string;
  status: string;
  roles: string[];
};

export const TENANT_INVITATIONS_QUERY_KEY = ["iam", "tenant-invitations"] as const;
export const TENANT_USERS_QUERY_KEY = ["iam", "tenant-users"] as const;

export function useTenantInvitations() {
  return useQuery({
    queryKey: TENANT_INVITATIONS_QUERY_KEY,
    queryFn: () =>
      apiFetch<TenantInvitation[]>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/invitations",
        authenticated: true,
      }),
  });
}

export function useTenantUsers() {
  return useQuery({
    queryKey: TENANT_USERS_QUERY_KEY,
    queryFn: () =>
      apiFetch<TenantUser[]>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/users",
        authenticated: true,
      }),
  });
}
