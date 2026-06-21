import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { makeServerQueryClient, prefetchPlans } from "@/lib/query/server";
import { PublicOnly } from "@/components/features/public-only";
import { RegisterClient } from "./register-client";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const client = makeServerQueryClient();
  await prefetchPlans(client);
  const state = dehydrate(client);
  return (
    <HydrationBoundary state={state}>
      <PublicOnly suppressIdentityRedirect>
        <RegisterClient />
      </PublicOnly>
    </HydrationBoundary>
  );
}
