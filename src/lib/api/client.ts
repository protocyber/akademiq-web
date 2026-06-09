"use client";

import { ApiError, ApiHttpError, ApiSuccess } from "./types";

const IAM_BASE =
  process.env.NEXT_PUBLIC_IAM_BASE_URL ?? "http://localhost:8081";
const BILLING_BASE =
  process.env.NEXT_PUBLIC_BILLING_BASE_URL ?? "http://localhost:8082";
const ACADEMIC_CONFIG_BASE =
  process.env.NEXT_PUBLIC_ACADEMIC_CONFIG_BASE_URL ?? "http://localhost:8083";

const ACCESS_KEY = "akademiq.access_token";
const REFRESH_KEY = "akademiq.refresh_token";

type Service = "iam" | "billing" | "academic-config";

function baseFor(service: Service): string {
  switch (service) {
    case "iam":
      return IAM_BASE;
    case "billing":
      return BILLING_BASE;
    case "academic-config":
      return ACADEMIC_CONFIG_BASE;
  }
}

export type RequestOptions = {
  service: Service;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

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
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?next=${next}`;
}

async function performFetch<T>(
  options: RequestOptions,
  retried: boolean,
): Promise<T> {
  const url = `${baseFor(options.service)}${options.path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.authenticated) {
    const token = getAccessToken();
    if (!token) {
      redirectToLogin();
      throw new ApiHttpError(401, {
        code: "UNAUTHENTICATED",
        message: "missing access token",
      });
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const resp = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
      redirectToLogin();
    }
    throw new ApiHttpError(resp.status, payload);
  }

  return (json as ApiSuccess<T>).data;
}

export function apiFetch<T>(options: RequestOptions): Promise<T> {
  return performFetch<T>(options, false);
}
