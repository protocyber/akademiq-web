"use client";

import { ApiError, ApiHttpError, ApiSuccess } from "./types";

const IAM_BASE =
  process.env.NEXT_PUBLIC_IAM_BASE_URL ?? "http://localhost:8081";
const BILLING_BASE =
  process.env.NEXT_PUBLIC_BILLING_BASE_URL ?? "http://localhost:8082";
const ACADEMIC_CONFIG_BASE =
  process.env.NEXT_PUBLIC_ACADEMIC_CONFIG_BASE_URL ?? "http://localhost:8083";
const ACADEMIC_OPS_BASE =
  process.env.NEXT_PUBLIC_ACADEMIC_OPS_BASE_URL ?? "http://localhost:8084";
const GRADING_BASE =
  process.env.NEXT_PUBLIC_GRADING_BASE_URL ?? "http://localhost:8086";

// ----- Token storage keys -----
// Identity token: issued by login/register, no tenant/role
const IDENTITY_KEY = "akademiq.identity_token";
// Tenant-scoped token pair: issued by /enter
const ACCESS_KEY = "akademiq.access_token";
const REFRESH_KEY = "akademiq.refresh_token";

type Service = "iam" | "billing" | "academic-config" | "academic-ops" | "grading";

function baseFor(service: Service): string {
  switch (service) {
    case "iam":
      return IAM_BASE;
    case "billing":
      return BILLING_BASE;
    case "academic-config":
      return ACADEMIC_CONFIG_BASE;
    case "academic-ops":
      return ACADEMIC_OPS_BASE;
    case "grading":
      return GRADING_BASE;
  }
}

export type RequestOptions = {
  service: Service;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Use identity token (typ:"identity") for tenant-less routes. */
  identityAuthenticated?: boolean;
  /** Use access token (typ:"access") for tenant-scoped routes. */
  authenticated?: boolean;
};

// --- identity token helpers -------------------------------------------------

export function getIdentityToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(IDENTITY_KEY);
}

export function setIdentityToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IDENTITY_KEY, token);
}

export function clearIdentityToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(IDENTITY_KEY);
}

// --- scoped token helpers ---------------------------------------------------

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export function clearAllTokens() {
  clearIdentityToken();
  clearTokens();
}

// --- refresh ----------------------------------------------------------------

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = getRefreshToken();
  const access = getAccessToken();
  if (!refresh || !access) return false;
  refreshInFlight = (async () => {
    try {
      const resp = await fetch(`${IAM_BASE}/api/v1/iam/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!resp.ok) return false;
      const json = (await resp.json()) as ApiSuccess<{
        access_token: string;
        refresh_token: string;
      }>;
      setTokens(json.data.access_token, json.data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  // Already on the login page: navigating again (and nesting `next`) would
  // produce an infinite redirect loop, so do nothing.
  if (window.location.pathname === "/login") return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?next=${next}`;
}

function redirectToTenantSelect() {
  if (typeof window === "undefined") return;
  window.location.href = `/tenant-select`;
}

async function performFetch<T>(
  options: RequestOptions,
  retried: boolean,
): Promise<T> {
  const url = `${baseFor(options.service)}${options.path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (options.identityAuthenticated) {
    // `/me` and other identity-scoped endpoints accept either token type.
    // Prefer the identity token, but fall back to the tenant-scoped access
    // token when the identity token is absent (e.g. a user who has entered a
    // tenant but whose identity token was cleared/expired). Without this
    // fallback, holding only a scoped access token caused an infinite
    // redirect loop on /login.
    const token = getIdentityToken() ?? getAccessToken();
    if (!token) {
      redirectToLogin();
      throw new ApiHttpError(401, {
        code: "UNAUTHENTICATED",
        message: "missing identity token",
      });
    }
    headers["Authorization"] = `Bearer ${token}`;
  } else if (options.authenticated) {
    const token = getAccessToken();
    if (!token) {
      // If we have an identity token but no access token, the user hasn't
      // selected a tenant yet — redirect to tenant selection rather than login.
      if (getIdentityToken()) {
        redirectToTenantSelect();
      } else {
        redirectToLogin();
      }
      throw new ApiHttpError(401, {
        code: "UNAUTHENTICATED",
        message: "missing access token",
      });
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const requestBody: BodyInit | undefined = options.body === undefined
    ? undefined
    : isFormData
      ? (options.body as FormData)
      : JSON.stringify(options.body);

  const resp = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: requestBody,
    credentials: "omit",
  });

  if (resp.status === 204) {
    return undefined as T;
  }

  const contentType = resp.headers.get("content-type") ?? "";
  const json = contentType.includes("application/json")
    ? await resp.json()
    : null;

  if (!resp.ok) {
    const payload: ApiError = json?.error ?? {
      code: `HTTP_${resp.status}`,
      message: resp.statusText || "request failed",
    };
    if (
      options.authenticated &&
      resp.status === 401 &&
      !retried &&
      (payload.code === "EXPIRED_ACCESS_TOKEN" ||
        payload.code === "UNAUTHENTICATED" ||
        payload.code === "INVALID_TOKEN")
    ) {
      const ok = await tryRefresh();
      if (ok) {
        return performFetch<T>(options, true);
      }
      clearTokens();
      // Fall back to tenant select if we still have an identity token.
      if (getIdentityToken()) {
        redirectToTenantSelect();
      } else {
        redirectToLogin();
      }
    }
    throw new ApiHttpError(resp.status, payload, json);
  }

  return (json as ApiSuccess<T>).data;
}

export function apiFetch<T>(options: RequestOptions): Promise<T> {
  return performFetch<T>(options, false);
}
