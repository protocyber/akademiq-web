"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type PlanFeatureView = {
  feature_code: string;
  enabled: boolean;
};

export type PlanView = {
  plan_id: string;
  code: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: PlanFeatureView[];
};

export const PLANS_QUERY_KEY = ["billing", "plans"] as const;

export function usePlans() {
  return useQuery({
    queryKey: PLANS_QUERY_KEY,
    queryFn: () =>
      apiFetch<PlanView[]>({
        service: "billing",
        path: "/api/v1/billing/plans",
      }),
  });
}
