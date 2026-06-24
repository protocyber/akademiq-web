"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, clearAllTokens, clearTokens, setTokens } from "@/lib/api/client";
import { serializeTenantUsersParams, type TenantUsersParams } from "@/lib/schemas/tenant-users-params";
import {
  TENANT_INVITATIONS_QUERY_KEY,
  TENANT_USERS_QUERY_KEY,
} from "@/lib/query/queries/use-tenant-users";
import { TENANT_ROLES_QUERY_KEY } from "@/lib/query/queries/use-tenant-roles";
import { ME_QUERY_KEY } from "@/lib/query/queries/use-me";
import type {
  AcceptInvitationForm,
  CreateTenantUserForm,
  InviteTenantUserForm,
  RoleChangeForm,
  UpdateTenantUserForm,
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
  password_set: boolean;
  set_password_token?: string;
};

export type SetPasswordInput = {
  password: string;
  token?: string;
};

export type ResendSetPasswordInput = {
  identifier?: string;
};

export type ResendSetPasswordResult = {
  accepted: boolean;
  set_password_token: string | null;
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

export type CreatedTenantUser = {
  user_id: string;
  username: string;
  email: string | null;
  full_name: string;
  roles: string[];
};

/** Build the create-user request body, dropping empty optional fields. */
function createTenantUserBody(input: CreateTenantUserForm) {
  const body: Record<string, unknown> = {
    username: input.username,
    full_name: input.full_name,
    roles: input.roles,
  };
  if (input.email) body.email = input.email;
  if (input.password) body.password = input.password;
  return body;
}

export function useCreateTenantUser() {
  const qc = useQueryClient();
  return useMutation<CreatedTenantUser, unknown, CreateTenantUserForm>({
    mutationFn: (input) =>
      apiFetch<CreatedTenantUser>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/users",
        method: "POST",
        authenticated: true,
        body: createTenantUserBody(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
    },
  });
}

export type UpdatedTenantUser = {
  user_id: string;
  username: string;
  email: string | null;
  full_name: string;
  status: string;
};

export function useUpdateTenantUser(userId: string) {
  const qc = useQueryClient();
  return useMutation<UpdatedTenantUser, unknown, UpdateTenantUserForm>({
    mutationFn: (input) => {
      const body: Record<string, unknown> = {
        username: input.username,
        full_name: input.full_name,
        // Send null to clear, a string to set.
        email: input.email ? input.email : null,
      };
      return apiFetch<UpdatedTenantUser>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/users/${userId}`,
        method: "PATCH",
        authenticated: true,
        body,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
    },
  });
}

export function useRemoveTenantUser(userId: string) {
  const qc = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: () =>
      apiFetch<void>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/users/${userId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
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

export function useSetPassword() {
  const qc = useQueryClient();
  return useMutation<void, unknown, SetPasswordInput>({
    mutationFn: (input) =>
      apiFetch<void>({
        service: "iam",
        path: "/api/v1/iam/auth/set-password",
        method: "POST",
        authenticated: !input.token,
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
      clearTokens();
    },
  });
}

export function useResendSetPassword() {
  return useMutation<ResendSetPasswordResult, unknown, ResendSetPasswordInput>({
    mutationFn: (input) =>
      apiFetch<ResendSetPasswordResult>({
        service: "iam",
        path: "/api/v1/iam/auth/set-password/resend",
        method: "POST",
        body: input,
      }),
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

/**
 * Bulk "add role" routed through the per-user add-role endpoint (by `role_id`)
 * so the `LAST_ROLE` / `LAST_ADMIN` guards run. This intentionally does NOT use
 * the legacy single-role `change_user_role` replace path (which bypasses the
 * guards and overwrites the audit-log payload).
 */
export function useBulkAddTenantUserRole() {
  const qc = useQueryClient();
  return useMutation<
    BulkTenantUserResult[],
    unknown,
    { user_ids: string[]; role_id: string }
  >({
    mutationFn: async ({ user_ids, role_id }) => {
      const results = await Promise.all(
        user_ids.map(async (user_id): Promise<BulkTenantUserResult> => {
          try {
            await apiFetch<void>({
              service: "iam",
              path: `/api/v1/iam/tenants/me/users/${user_id}/roles/${role_id}`,
              method: "POST",
              authenticated: true,
            });
            return { user_id, success: true, reason: null };
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : "gagal";
            return { user_id, success: false, reason };
          }
        }),
      );
      return results;
    },
    onSuccess: () => {
      invalidateTenantUsers(qc);
      qc.invalidateQueries({ queryKey: TENANT_ROLES_QUERY_KEY });
    },
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
