"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch, apiFetchEnvelope } from "@/lib/api/client";
import { DEFAULT_TENANT_USERS_PARAMS, serializeTenantUsersParams, tenantUsersParamsKey, type TenantUsersParams } from "@/lib/schemas/tenant-users-params";

export type TenantInvitation = {
  invitation_id: string;
  tenant_id: string;
  email: string;
  role_code?: string;
  roles?: string[];
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

export type PaginatedTenantUsers = {
  data: TenantUser[];
  meta: {
    page: number;
    page_size: number;
    total: number;
  };
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

export function useTenantUsers(params: TenantUsersParams = DEFAULT_TENANT_USERS_PARAMS) {
  const query = serializeTenantUsersParams(params);
  return useQuery({
    queryKey: [...TENANT_USERS_QUERY_KEY, ...tenantUsersParamsKey(params)],
    queryFn: async (): Promise<PaginatedTenantUsers> => {
      const envelope = await apiFetchEnvelope<TenantUser[]>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/users${query ? `?${query}` : ""}`,
        authenticated: true,
      });
      return {
        data: envelope.data,
        meta: envelope.meta as PaginatedTenantUsers["meta"],
      };
    },
  });
}

export type InvitationDetails = {
  invitation_id: string;
  tenant_id: string;
  tenant_name: string | null;
  email: string;
  roles: string[];
  status: string;
  expires_at: string;
};

export function useInvitationDetails(token: string) {
  return useQuery({
    queryKey: ["iam", "invitation-details", token],
    queryFn: () =>
      apiFetch<InvitationDetails>({
        service: "iam",
        path: `/api/v1/iam/invitations/details?token=${encodeURIComponent(token)}`,
      }),
    enabled: !!token,
  });
}

