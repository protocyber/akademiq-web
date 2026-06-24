/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearAllTokens, getAccessToken, getIdentityToken, setIdentityToken, setTokens } from "@/lib/api/client";
import { useLogin } from "@/lib/query/mutations/use-login";
import { useSetPassword } from "@/lib/query/mutations/use-tenant-users";

const IAM_BASE = process.env.NEXT_PUBLIC_IAM_BASE_URL ?? "http://localhost:8081";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  clearAllTokens();
});

describe("auth mutations", () => {
  it("clears stale tokens before login request", async () => {
    setIdentityToken("old-identity");
    setTokens("old-access", "old-refresh");
    const calls: { auth: string | null }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ auth: (init?.headers as Record<string, string> | undefined)?.Authorization ?? null });
      return jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", message: "bad" } });
    }));

    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ identifier: "user@school.test", password: "wrong" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(calls[0].auth).toBeNull();
    expect(getIdentityToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("uses unauthenticated set-password request when token is present", async () => {
    setTokens("old-access", "old-refresh");
    const calls: { url: string; auth: string | null }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        auth: (init?.headers as Record<string, string> | undefined)?.Authorization ?? null,
      });
      return new Response(null, { status: 204 });
    }));

    const { result } = renderHook(() => useSetPassword(), { wrapper });
    result.current.mutate({ password: "newpassword123!", token: "set-token" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls).toEqual([{ url: `${IAM_BASE}/api/v1/iam/auth/set-password`, auth: null }]);
  });
});
