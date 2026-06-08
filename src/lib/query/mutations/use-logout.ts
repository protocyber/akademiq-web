"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch, clearTokens, getAccessToken, getRefreshToken } from "@/lib/api/client";

export function useLogout() {
  const qc = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: async () => {
      const refresh = getRefreshToken();
      const access = getAccessToken();
      if (refresh && access) {
        try {
          await apiFetch<void>({
            service: "iam",
            path: "/api/v1/iam/auth/logout",
            method: "POST",
            body: { refresh_token: refresh },
            authenticated: true,
          });
        } catch {
          // Best-effort; tokens are cleared regardless.
        }
      }
      clearTokens();
      qc.clear();
    },
  });
}
