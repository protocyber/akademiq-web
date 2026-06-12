"use client";

import * as React from "react";

import { useMe } from "@/lib/query/queries/use-me";
import { getAccessToken, getIdentityToken } from "@/lib/api/client";

export type AuthSnapshot = {
  isLoading: boolean;
  /** True if the user holds any valid token (identity or scoped). */
  isAuthenticated: boolean;
  /** True if the user holds a tenant-scoped access token (has entered a tenant). */
  hasScopedToken: boolean;
  user: ReturnType<typeof useMe>["data"];
};

/**
 * Hook for components that need to react to auth state. Wraps `useMe`
 * but only enables the query when a token (identity or scoped) is present.
 */
export function useAuth(): AuthSnapshot {
  const [hasToken, setHasToken] = React.useState<boolean>(
    () => !!(getIdentityToken() || getAccessToken()),
  );
  const [hasScopedToken, setHasScopedToken] = React.useState<boolean>(
    () => !!getAccessToken(),
  );

  React.useEffect(() => {
    const sync = () => {
      setHasToken(!!(getIdentityToken() || getAccessToken()));
      setHasScopedToken(!!getAccessToken());
    };
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const me = useMe(hasToken);

  return {
    isLoading: hasToken && me.isLoading,
    isAuthenticated: hasToken && !!me.data,
    hasScopedToken,
    user: me.data,
  };
}
