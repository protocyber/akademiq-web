"use client";

import * as React from "react";

import { useMe } from "@/lib/query/queries/use-me";
import { getAccessToken, getIdentityToken } from "@/lib/api/client";

export type AuthSnapshot = {
  isLoading: boolean;
  isAuthenticated: boolean;
  hasScopedToken: boolean;
  needsPassword: boolean;
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
    window.addEventListener("akademiq:tokens-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("akademiq:tokens-changed", sync);
    };
  }, []);

  const me = useMe(hasToken);

  return {
    isLoading: hasToken && me.isLoading,
    isAuthenticated: hasToken && !!me.data,
    hasScopedToken,
    needsPassword: hasScopedToken && me.data?.password_set === false,
    user: me.data,
  };
}
