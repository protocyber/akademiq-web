"use client";

import { useMutation } from "@tanstack/react-query";

import { apiFetch, setIdentityToken, setTokens } from "@/lib/api/client";

const IAM_BASE = process.env.NEXT_PUBLIC_IAM_BASE_URL ?? "http://localhost:8081";

export type LoginInput = {
  identifier: string;
  password: string;
};

/** Shape returned by POST /auth/login — identity token only, no tenant/role. */
export type LoginResult = {
  identity_token: string;
  expires_in: number;
};

/** Shape returned by POST /tenants/{id}/enter — tenant-scoped token pair. */
export type EnterTenantResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

/** One membership entry from GET /my-tenants. */
export type TenantEntry = {
  tenant_id: string;
  tenant_name: string;
  roles: string[];
};

export function useLogin() {
  return useMutation<LoginResult, unknown, LoginInput>({
    mutationFn: async (input) => {
      const data = await apiFetch<LoginResult>({
        service: "iam",
        path: "/api/v1/iam/auth/login",
        method: "POST",
        body: input,
      });
      // Store identity token; scoped tokens are obtained after tenant selection.
      setIdentityToken(data.identity_token);
      return data;
    },
  });
}

export function googleLoginStartUrl() {
  return `${IAM_BASE}/api/v1/iam/auth/google/start`;
}

export function storeIdentityToken(identityToken: string) {
  setIdentityToken(identityToken);
}

export function useMyTenants() {
  return useMutation<TenantEntry[], unknown, void>({
    mutationFn: async () => {
      return apiFetch<TenantEntry[]>({
        service: "iam",
        path: "/api/v1/iam/my-tenants",
        method: "GET",
        identityAuthenticated: true,
      });
    },
  });
}

export function useEnterTenant() {
  return useMutation<EnterTenantResult, unknown, { tenantId: string }>({
    mutationFn: async ({ tenantId }) => {
      const data = await apiFetch<EnterTenantResult>({
        service: "iam",
        path: `/api/v1/iam/tenants/${tenantId}/enter`,
        method: "POST",
        identityAuthenticated: true,
      });
      setTokens(data.access_token, data.refresh_token);
      return data;
    },
  });
}
