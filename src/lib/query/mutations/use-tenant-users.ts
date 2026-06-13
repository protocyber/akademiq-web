"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, clearAllTokens, setTokens } from "@/lib/api/client";
import {
  TENANT_INVITATIONS_QUERY_KEY,
  TENANT_USERS_QUERY_KEY,
} from "@/lib/query/queries/use-tenant-users";
import type {
  AcceptInvitationForm,
  InviteTenantUserForm,
  RoleChangeForm,
} from "@/lib/schemas/tenant-user-management";

export type InviteTenantUserResult = {
  invitation_id: string;
  email: string;
  role_code: string;
  status: string;
  expires_at: string;
  activation_link: string;
  token: string;
};

export type AcceptInvitationResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export function useInviteTenantUser() {
  const qc = useQueryClient();
  return useMutation<InviteTenantUserResult, unknown, InviteTenantUserForm>({
    mutationFn: (input) =>
      apiFetch<InviteTenantUserResult>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/invitations",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_INVITATIONS_QUERY_KEY });
    },
  });
}

export function useAcceptInvitation() {
  return useMutation<AcceptInvitationResult, unknown, AcceptInvitationForm>({
    mutationFn: async (input) => {
      // Drop any stale tokens from a previous session/tenant first. Accepting
      // an invitation with an already-registered email otherwise leaves a
      // mismatched token mix in localStorage that breaks auth resolution.
      clearAllTokens();
      const data = await apiFetch<AcceptInvitationResult>({
        service: "iam",
        path: "/api/v1/iam/invitations/accept",
        method: "POST",
        body: input,
      });
      setTokens(data.access_token, data.refresh_token);
      return data;
    },
  });
}

export function useChangeTenantUserRole(userId: string) {
  const qc = useQueryClient();
  return useMutation<void, unknown, RoleChangeForm>({
    mutationFn: (input) =>
      apiFetch<void>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/users/${userId}/role`,
        method: "PATCH",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
    },
  });
}

export function useSetTenantUserEnabled(userId: string, enabled: boolean) {
  const qc = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: () =>
      apiFetch<void>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/users/${userId}/${enabled ? "enable" : "disable"}`,
        method: "POST",
        authenticated: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
    },
  });
}

export function useRevokeInvitation(invitationId: string) {
  const qc = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: () =>
      apiFetch<void>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/invitations/${invitationId}/revoke`,
        method: "POST",
        authenticated: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_INVITATIONS_QUERY_KEY });
    },
  });
}
