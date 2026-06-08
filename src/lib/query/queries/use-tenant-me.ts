"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type ModuleView = {
  feature_code: string;
  plan_entitled: boolean;
  enabled: boolean;
};

export type TenantMeView = {
  tenant_id: string;
  school_name: string;
  status: string;
  current_plan: { plan_id: string; code: string; name: string } | null;
  modules: ModuleView[];
};

export const TENANT_ME_QUERY_KEY = ["billing", "tenant-me"] as const;

export function useTenantMe(enabled = true) {
  return useQuery({
    queryKey: TENANT_ME_QUERY_KEY,
    queryFn: () =>
      apiFetch<TenantMeView>({
        service: "billing",
        path: "/api/v1/billing/tenants/me",
        authenticated: true,
      }),
    enabled,
  });
}
