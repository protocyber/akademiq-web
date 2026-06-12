"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";

/**
 * Client-side guard for public pages (`/login`, `/register`). Redirects
 * already-authenticated users:
 * - With a scoped token → /dashboard (they're inside a tenant)
 * - With only an identity token → /tenant-select (they need to pick a tenant)
 */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated, hasScopedToken } = useAuth();
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
        router.replace(next && next.startsWith("/") ? next : "/dashboard");
      } else {
        router.replace("/tenant-select");
      }
    }
  }, [isAuthenticated, hasScopedToken, isLoading, router]);

  if (!bootChecked || isAuthenticated) return null;
  return <>{children}</>;
}
