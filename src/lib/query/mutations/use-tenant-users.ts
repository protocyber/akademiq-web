"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, clearAllTokens, setTokens } from "@/lib/api/client";
import { serializeTenantUsersParams, type TenantUsersParams } from "@/lib/schemas/tenant-users-params";
import {
  TENANT_INVITATIONS_QUERY_KEY,
  TENANT_USERS_QUERY_KEY,
} from "@/lib/query/queries/use-tenant-users";
import { TENANT_ROLES_QUERY_KEY } from "@/lib/query/queries/use-tenant-roles";
import type {
  AcceptInvitationForm,
  InviteTenantUserForm,
  RoleChangeForm,
} from "@/lib/schemas/tenant-user-management";

export type InviteTenantUserResult = {
  invitation_id: string;
  email: string;
  roles: string[];
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

export function useAddTenantUserRole(userId: string) {
  const qc = useQueryClient();
  return useMutation<void, unknown, { roleId: string }>({
    mutationFn: ({ roleId }) =>
      apiFetch<void>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/users/${userId}/roles/${roleId}`,
        method: "POST",
        authenticated: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: TENANT_ROLES_QUERY_KEY });
    },
  });
}

export function useRemoveTenantUserRole(userId: string) {
  const qc = useQueryClient();
  return useMutation<void, unknown, { roleId: string }>({
    mutationFn: ({ roleId }) =>
      apiFetch<void>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/users/${userId}/roles/${roleId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: TENANT_ROLES_QUERY_KEY });
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

export type BulkTenantUserResult = {
  user_id: string;
  success: boolean;
  reason: string | null;
};

function invalidateTenantUsers(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
}

export function useBulkEnableTenantUsers() {
  const qc = useQueryClient();
  return useMutation<BulkTenantUserResult[], unknown, { user_ids: string[] }>({
    mutationFn: (input) =>
      apiFetch<BulkTenantUserResult[]>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/users/bulk/enable",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => invalidateTenantUsers(qc),
  });
}

export function useBulkDisableTenantUsers() {
  const qc = useQueryClient();
  return useMutation<BulkTenantUserResult[], unknown, { user_ids: string[] }>({
    mutationFn: (input) =>
      apiFetch<BulkTenantUserResult[]>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/users/bulk/disable",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => invalidateTenantUsers(qc),
  });
}

export function useBulkChangeTenantUserRole() {
  const qc = useQueryClient();
  return useMutation<BulkTenantUserResult[], unknown, { user_ids: string[]; role: string }>({
    mutationFn: (input) =>
      apiFetch<BulkTenantUserResult[]>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/users/bulk/role",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => invalidateTenantUsers(qc),
  });
}

export function useResetTenantUserPassword() {
  return useMutation<{ temporary_password: string }, unknown, { userId: string }>({
    mutationFn: ({ userId }) =>
      apiFetch<{ temporary_password: string }>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/users/${userId}/reset-password`,
        method: "POST",
        authenticated: true,
      }),
  });
}

export async function exportTenantUsers(params: TenantUsersParams) {
  const query = serializeTenantUsersParams({ ...params, page: 1 });
  const response = await fetch(`/api/v1/iam/tenants/me/users/export${query ? `?${query}` : ""}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tenant-users.csv";
  link.click();
  URL.revokeObjectURL(url);
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
