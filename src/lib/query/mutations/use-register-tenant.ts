"use client";

import { useMutation } from "@tanstack/react-query";

import { apiFetch, clearAllTokens, setTokens } from "@/lib/api/client";

export type RegisterTenantInput = {
  school_name: string;
  plan_id: string;
  admin_email: string;
  admin_password: string;
  admin_full_name: string;
};

export type RegisterTenantResult = {
  tenant_id: string;
  user_id: string;
  subscription_id: string;
  plan_code: string;
};

export function useRegisterTenant() {
  return useMutation<RegisterTenantResult, unknown, RegisterTenantInput>({
    mutationFn: async (input) => {
      // Clear any stale tokens before registering a brand-new tenant so we
      // don't carry over a previous session's identity/scoped tokens.
      clearAllTokens();
      const data = await apiFetch<RegisterTenantResult>({
        service: "billing",
        path: "/api/v1/billing/tenants/register",
        method: "POST",
        body: input,
      });
      // After registering, log the admin in immediately so the
      // dashboard is authenticated. We do this by calling /auth/login
      // since registration does not return tokens directly.
      const tokens = await apiFetch<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
      }>({
        service: "iam",
        path: "/api/v1/iam/auth/login",
        method: "POST",
        body: { identifier: input.admin_email, password: input.admin_password },
      });
      setTokens(tokens.access_token, tokens.refresh_token);
      return data;
    },
  });
}
