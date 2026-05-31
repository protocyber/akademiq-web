/**
 * Server-side helpers for SSR prefetching with TanStack Query.
 *
 * Used by pages that want to render with data already in the
 * dehydrated cache (e.g. `/register` plan catalog) so the same hooks
 * read prefetched data on the client without a second network round
 * trip.
 *
 * NOTE: Calls made from this module run inside the Next.js request
 * lifecycle. They do NOT have access to the user's access token; only
 * public endpoints should be prefetched here.
 */

import { QueryClient } from "@tanstack/react-query";

import { PLANS_QUERY_KEY, type PlanView } from "@/lib/query/queries/use-plans";
import type { ApiSuccess } from "@/lib/api/types";

const BILLING_BASE =
  process.env.NEXT_PUBLIC_BILLING_BASE_URL ?? "http://localhost:8082";

export function makeServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Server prefetch should not refetch in the background; the
        // client-side QueryClient takes over after hydration.
        staleTime: 60 * 1000,
        retry: false,
      },
    },
  });
}

export async function prefetchPlans(client: QueryClient): Promise<void> {
  await client.prefetchQuery({
    queryKey: PLANS_QUERY_KEY,
    queryFn: async () => {
      const resp = await fetch(`${BILLING_BASE}/api/v1/billing/plans`, {
        // SSR: no cookies, no credentials, fast cache.
        cache: "no-store",
      });
      if (!resp.ok) {
        // Don't throw during SSR — the client-side query will retry and
        // surface the error. Returning an empty array keeps the wizard
        // renderable.
        return [] as PlanView[];
      }
      const json = (await resp.json()) as ApiSuccess<PlanView[]>;
      return json.data;
    },
  });
}
