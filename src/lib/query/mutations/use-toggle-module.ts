"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { TENANT_ME_QUERY_KEY } from "@/lib/query/queries/use-tenant-me";

export type ToggleModuleInput = {
  feature_code: string;
  enabled: boolean;
};

export function useToggleModule() {
  const qc = useQueryClient();
  return useMutation<void, unknown, ToggleModuleInput>({
    mutationFn: async (input) => {
      await apiFetch<void>({
        service: "billing",
        path: "/api/v1/billing/tenants/me/modules",
        method: "PATCH",
        authenticated: true,
        body: input,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_ME_QUERY_KEY });
    },
  });
}
