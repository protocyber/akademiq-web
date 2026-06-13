"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type Permission = {
  code: string;
  description: string;
  held: boolean;
};

export type TenantRole = {
  role_id: string;
  code: string;
  name: string;
  is_builtin: boolean;
  permissions: string[];
};

export const TENANT_PERMISSIONS_QUERY_KEY = ["iam", "tenant-permissions"] as const;
export const TENANT_ROLES_QUERY_KEY = ["iam", "tenant-roles"] as const;

export function useTenantPermissions(enabled = true) {
  return useQuery({
    queryKey: TENANT_PERMISSIONS_QUERY_KEY,
    queryFn: () =>
      apiFetch<Permission[]>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/permissions",
        authenticated: true,
      }),
    enabled,
  });
}

export function useTenantRoles(enabled = true) {
  return useQuery({
    queryKey: TENANT_ROLES_QUERY_KEY,
    queryFn: () =>
      apiFetch<TenantRole[]>({
        service: "iam",
        path: "/api/v1/iam/tenants/me/roles",
        authenticated: true,
      }),
    enabled,
  });
}
