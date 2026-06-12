"use client";

import { useMutation } from "@tanstack/react-query";

import { apiFetch, setIdentityToken } from "@/lib/api/client";

export type PublicSignupInput = {
  email: string;
  password: string;
  username?: string;
};

export type PublicSignupResult = {
  identity_token: string;
  expires_in: number;
};

export function usePublicSignup() {
  return useMutation<PublicSignupResult, unknown, PublicSignupInput>({
    mutationFn: async (input) => {
      const data = await apiFetch<PublicSignupResult>({
        service: "iam",
        path: "/api/v1/iam/auth/register",
        method: "POST",
        body: input,
      });
      setIdentityToken(data.identity_token);
      return data;
    },
  });
}
