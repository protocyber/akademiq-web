"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";

/**
 * Client-side guard for public pages (`/login`, `/register`). Redirects
 * already-authenticated users to `/dashboard` (or to `?next` if the
 * current URL carries one). Renders nothing while the check is in
 * flight so flickering forms aren't shown to users who shouldn't see
 * them.
 */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const [bootChecked, setBootChecked] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) return;
    setBootChecked(true);
    if (isAuthenticated) {
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (!bootChecked || isAuthenticated) return null;
  return <>{children}</>;
}
