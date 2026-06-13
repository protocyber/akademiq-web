/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiFetch,
  clearAllTokens,
  clearTokens,
  setIdentityToken,
  setTokens,
} from "@/lib/api/client";
import { ApiHttpError } from "@/lib/api/types";

const IAM_BASE = process.env.NEXT_PUBLIC_IAM_BASE_URL ?? "http://localhost:8081";
const BILLING_BASE = process.env.NEXT_PUBLIC_BILLING_BASE_URL ?? "http://localhost:8082";

const originalLocation = window.location;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  clearTokens();
  setTokens("access-1", "refresh-1");
  // Stub window.location.href so our redirect-on-failure assertion works
  // without leaving jsdom.
  delete (window as unknown as { location?: Location }).location;
  (window as unknown as { location: Location }).location = {
    ...originalLocation,
    pathname: "/dashboard",
    search: "",
    href: "http://localhost:3000/dashboard",
  } as Location;
});

afterEach(() => {
  vi.restoreAllMocks();
  clearTokens();
  (window as unknown as { location: Location }).location = originalLocation;
});

describe("apiFetch refresh-on-401", () => {
  it("refreshes once and retries the original request", async () => {
    const calls: { url: string; method: string; auth: string | null }[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const auth = (init?.headers as Record<string, string> | undefined)?.["Authorization"] ?? null;
      calls.push({ url, method, auth });

      // First call to the protected endpoint: 401 expired.
      if (url === `${BILLING_BASE}/api/v1/billing/tenants/me` && calls.filter(c => c.url === url).length === 1) {
        return jsonResponse(401, {
          error: { code: "EXPIRED_ACCESS_TOKEN", message: "expired" },
        });
      }

      // Refresh call: success, hand out new tokens.
      if (url === `${IAM_BASE}/api/v1/iam/auth/refresh`) {
        return jsonResponse(200, {
          data: {
            access_token: "access-2",
            refresh_token: "refresh-2",
            expires_in: 900,
          },
          meta: {},
        });
      }

      // Retry of protected endpoint: success.
      if (url === `${BILLING_BASE}/api/v1/billing/tenants/me`) {
        return jsonResponse(200, {
          data: { tenant_id: "t1", school_name: "X", status: "active", current_plan: null, modules: [] },
          meta: {},
        });
      }

      throw new Error(`unexpected fetch ${method} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await apiFetch<{ tenant_id: string }>({
      service: "billing",
      path: "/api/v1/billing/tenants/me",
      authenticated: true,
    });

    expect(data.tenant_id).toBe("t1");
    // 1) initial 401, 2) refresh, 3) retry success.
    expect(calls).toHaveLength(3);
    expect(calls[0].auth).toBe("Bearer access-1");
    expect(calls[1].url).toBe(`${IAM_BASE}/api/v1/iam/auth/refresh`);
    expect(calls[2].auth).toBe("Bearer access-2");
  });

  it("redirects to /login?next=... when refresh fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === `${IAM_BASE}/api/v1/iam/auth/refresh`) {
        return jsonResponse(401, {
          error: { code: "INVALID_REFRESH_TOKEN", message: "no" },
        });
      }
      return jsonResponse(401, {
        error: { code: "EXPIRED_ACCESS_TOKEN", message: "expired" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiFetch({
        service: "billing",
        path: "/api/v1/billing/tenants/me",
        authenticated: true,
      }),
    ).rejects.toBeInstanceOf(ApiHttpError);

    expect(window.location.href).toContain("/login?next=");
    expect(window.location.href).toContain(encodeURIComponent("/dashboard"));
  });
});

describe("apiFetch identity-authenticated token fallback", () => {
  it("uses the scoped access token when no identity token is present", async () => {
    // Only a scoped access token exists (e.g. user entered a tenant but the
    // identity token was cleared/expired). This previously caused an
    // infinite redirect loop on /login.
    clearAllTokens();
    setTokens("scoped-access", "scoped-refresh");

    const calls: { url: string; auth: string | null }[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const auth = (init?.headers as Record<string, string> | undefined)?.["Authorization"] ?? null;
      calls.push({ url, auth });
      return jsonResponse(200, {
        data: { user_id: "u1", memberships: [] },
        meta: {},
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const data = await apiFetch<{ user_id: string }>({
      service: "iam",
      path: "/api/v1/iam/me",
      identityAuthenticated: true,
    });

    expect(data.user_id).toBe("u1");
    expect(calls).toHaveLength(1);
    expect(calls[0].auth).toBe("Bearer scoped-access");
    // No redirect should have happened.
    expect(window.location.href).toBe("http://localhost:3000/dashboard");
  });

  it("prefers the identity token when both are present", async () => {
    clearAllTokens();
    setIdentityToken("identity-1");
    setTokens("scoped-access", "scoped-refresh");

    const calls: { auth: string | null }[] = [];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string> | undefined)?.["Authorization"] ?? null;
      calls.push({ auth });
      return jsonResponse(200, { data: { user_id: "u1" }, meta: {} });
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch({
      service: "iam",
      path: "/api/v1/iam/me",
      identityAuthenticated: true,
    });

    expect(calls[0].auth).toBe("Bearer identity-1");
  });

  it("does not nest `next` / loop when already on /login", async () => {
    clearAllTokens();
    (window as unknown as { location: Location }).location = {
      ...originalLocation,
      pathname: "/login",
      search: "?next=%2Fdashboard",
      href: "http://localhost:3000/login?next=%2Fdashboard",
    } as Location;

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiFetch({
        service: "iam",
        path: "/api/v1/iam/me",
        identityAuthenticated: true,
      }),
    ).rejects.toBeInstanceOf(ApiHttpError);

    // href is unchanged: no redirect was triggered while already on /login.
    expect(window.location.href).toBe("http://localhost:3000/login?next=%2Fdashboard");
    // The request was never sent because no token was available.
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
