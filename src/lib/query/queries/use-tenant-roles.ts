"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch, apiFetchEnvelope } from "@/lib/api/client";
import {
  DEFAULT_TENANT_ROLES_PARAMS,
  serializeTenantRolesParams,
  tenantRolesParamsKey,
  type TenantRolesParams,
} from "@/lib/schemas/tenant-roles-params";

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
  user_count: number;
};

export type PaginatedTenantRoles = {
  data: TenantRole[];
  meta: {
    page: number;
    page_size: number;
    total: number;
  };
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

export function useTenantRoles(params: TenantRolesParams = DEFAULT_TENANT_ROLES_PARAMS) {
  const query = serializeTenantRolesParams(params);
  return useQuery({
    queryKey: [...TENANT_ROLES_QUERY_KEY, ...tenantRolesParamsKey(params)],
    queryFn: async (): Promise<PaginatedTenantRoles> => {
      const envelope = await apiFetchEnvelope<TenantRole[]>({
        service: "iam",
        path: `/api/v1/iam/tenants/me/roles${query ? `?${query}` : ""}`,
        authenticated: true,
      });
      return {
        data: envelope.data,
        meta: envelope.meta as PaginatedTenantRoles["meta"],
      };
    },
  });
}

/**
 * Non-paginated role list for screens that just need the full role set
 * (e.g. the users screen's role dropdowns). Fetches a large page and
 * returns `TenantRole[]` directly.
 */
export function useAllTenantRoles() {
  const query = useTenantRoles({
    page: 1,
    page_size: 100,
    sort: "name",
  });
  return {
    ...query,
    data: query.data?.data,
  };
}
