"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";

/**
 * Client-side guard for public pages (`/login`, `/register`). Redirects
 * already-authenticated users:
 * - With a scoped token → /dashboard (they're inside a tenant)
 * - With only an identity token → /tenant-select (they need to pick a tenant)
 *
 * Set `suppressIdentityRedirect` to keep the page mounted while a login flow
 * is in flight (the page owns the identity → tenant → scoped transition and
 * will navigate itself once it resolves).
 */
export function PublicOnly({
  children,
  suppressIdentityRedirect = false,
}: {
  children: React.ReactNode;
  suppressIdentityRedirect?: boolean;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated, hasScopedToken, needsPassword } = useAuth();
  const [bootChecked, setBootChecked] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) return;
    setBootChecked(true);
    if (isAuthenticated) {
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      if (hasScopedToken) {
        router.replace(needsPassword ? "/set-password" : next && next.startsWith("/") ? next : "/dashboard");
      } else if (!suppressIdentityRedirect) {
        router.replace("/tenant-select");
      }
    }
  }, [isAuthenticated, hasScopedToken, isLoading, needsPassword, router, suppressIdentityRedirect]);

  if (!bootChecked) return null;
  // Keep the page mounted while an in-flight login submit holds only an
  // identity token but hasn't entered a tenant yet.
  if (isAuthenticated && !hasScopedToken && suppressIdentityRedirect) {
    return <>{children}</>;
  }
  if (isAuthenticated) return null;
  return <>{children}</>;
}
