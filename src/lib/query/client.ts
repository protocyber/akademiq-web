"use client";

import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Avoid spamming retries on auth errors; the api client handles refresh.
          if (
            error instanceof Error &&
            (error.message.includes("UNAUTHENTICATED") ||
              error.message.includes("EXPIRED_ACCESS_TOKEN"))
          ) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
