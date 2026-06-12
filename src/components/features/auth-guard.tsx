"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";

/**
 * Client-side guard for tenant-scoped pages. Requires a valid tenant-scoped
 * access token (`typ:"access"`).
 *
 * - Unauthenticated visitors → /login
 * - Identity-only sessions (no tenant entered) → /tenant-select
 * - Authenticated + tenant-scoped → renders children
 */
export function AuthGuard({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated, hasScopedToken } = useAuth();
  const [bootChecked, setBootChecked] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) return;
    setBootChecked(true);
    if (!isAuthenticated) {
      const path =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(path)}`);
    } else if (!hasScopedToken) {
      // Authenticated but hasn't entered a tenant yet.
      router.replace("/tenant-select");
    }
  }, [isAuthenticated, hasScopedToken, isLoading, router]);

  if (!bootChecked) return <>{fallback}</>;
  if (!isAuthenticated || !hasScopedToken) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * Guard for tenant-less routes that still require authentication
 * (e.g. /tenant-select, /me). Accepts both identity tokens and scoped tokens.
 */
export function IdentityGuard({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const [bootChecked, setBootChecked] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) return;
    setBootChecked(true);
    if (!isAuthenticated) {
      const path =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/tenant-select";
      router.replace(`/login?next=${encodeURIComponent(path)}`);
    }
  }, [isAuthenticated, isLoading, router]);

  if (!bootChecked) return <>{fallback}</>;
  if (!isAuthenticated) return <>{fallback}</>;
  return <>{children}</>;
}
