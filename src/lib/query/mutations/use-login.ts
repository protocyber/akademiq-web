"use client";

import { useMutation } from "@tanstack/react-query";

import { apiFetch, setTokens } from "@/lib/api/client";

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
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
      setTokens(data.access_token, data.refresh_token);
      return data;
    },
  });
}
