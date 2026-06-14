"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import {
  TENANT_PERMISSIONS_QUERY_KEY,
  TENANT_ROLES_QUERY_KEY,
} from "@/lib/query/queries/use-tenant-roles";
import { TENANT_USERS_QUERY_KEY } from "@/lib/query/queries/use-tenant-users";
import type { CreateTenantRoleForm, UpdateTenantRoleForm } from "@/lib/schemas/tenant-role-management";

export type CreateRoleResult = {
  role_id: string;
};

export function useCreateTenantRole() {
  const qc = useQueryClient();
  return useMutation<CreateRoleResult, unknown, CreateTenantRoleForm>({
    mutationFn: (input) =>
      apiFetch<CreateRoleResult>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/roles",
        method: "POST",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_ROLES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: TENANT_PERMISSIONS_QUERY_KEY });
    },
  });
}

export function useUpdateTenantRole(roleId: string) {
  const qc = useQueryClient();
  return useMutation<void, unknown, UpdateTenantRoleForm>({
    mutationFn: (input) =>
      apiFetch<void>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/roles/${roleId}`,
        method: "PATCH",
        authenticated: true,
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_ROLES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
    },
  });
}

export function useDeleteTenantRole(roleId: string) {
  const qc = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: () =>
      apiFetch<void>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/roles/${roleId}`,
        method: "DELETE",
        authenticated: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_ROLES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
    },
  });
}

export function useBulkDeleteTenantRoles() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string[]>({
    mutationFn: (roleIds) =>
      apiFetch<void>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/roles/bulk/delete",
        method: "POST",
        authenticated: true,
        body: { role_ids: roleIds },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_ROLES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY });
    },
  });
}
