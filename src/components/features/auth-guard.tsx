"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";

/**
 * Client-side guard for authenticated pages. Redirects unauthenticated
 * visitors to `/login?next=<current-path>`. Renders `fallback` while
 * the auth check is in flight (typically a skeleton) so the protected
 * UI never flashes for unauthenticated users.
 */
export function AuthGuard({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuth();
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
    }
  }, [isAuthenticated, isLoading, router]);

  if (!bootChecked) return <>{fallback}</>;
  if (!isAuthenticated || !user) return <>{fallback}</>;
  return <>{children}</>;
}
