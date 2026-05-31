"use client";

import * as React from "react";

import { useMe } from "@/lib/query/queries/use-me";
import { getAccessToken } from "@/lib/api/client";

export type AuthSnapshot = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: ReturnType<typeof useMe>["data"];
};

/**
 * Hook for components that need to react to auth state. Wraps `useMe`
 * but only enables the query when an access token is present so we
 * don't fire a guaranteed-401 request to `/me` on the public pages.
 */
export function useAuth(): AuthSnapshot {
  const [hasToken, setHasToken] = React.useState<boolean>(() => !!getAccessToken());

  // Re-check on focus and on the storage event so a logout from another
  // tab clears the local UI state.
  React.useEffect(() => {
    const sync = () => setHasToken(!!getAccessToken());
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
    user: me.data,
  };
}
