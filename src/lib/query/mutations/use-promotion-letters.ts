"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { PROMOTION_QUERY_KEY } from "@/lib/query/queries/use-promotion";
import type { ClassLetter } from "@/lib/query/queries/use-promotion-letters";

const BASE = "/api/v1/academic-ops/promotion-runs";

function useSettle() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: PROMOTION_QUERY_KEY });
}

export function useIssueClassLetter(runId: string) {
  const settle = useSettle();
  return useMutation({
    mutationFn: ({
      homeroomId,
      ...body
    }: {
      homeroomId: string;
      letter_number: string;
      letter_date: string;
      city: string | null;
    }) =>
      apiFetch<ClassLetter>({
        service: "academic-ops",
        path: `${BASE}/${runId}/class-letters/${homeroomId}`,
        method: "PUT",
        authenticated: true,
        body,
      }),
    onSettled: settle,
  });
}

export type CertificateItem = { student_id: string; certificate_number: string };

export function useIssueCertificates(runId: string) {
  const settle = useSettle();
  return useMutation({
    mutationFn: (body: { letter_date: string; city: string | null; items: CertificateItem[] }) =>
      apiFetch<{ updated: number }>({
        service: "academic-ops",
        path: `${BASE}/${runId}/certificates`,
        method: "PUT",
        authenticated: true,
        body,
      }),
    onSettled: settle,
  });
}

export function useRefreshLetterPrincipal(runId: string) {
  const settle = useSettle();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ updated: number }>({
        service: "academic-ops",
        path: `${BASE}/${runId}/letters/refresh-principal`,
        method: "POST",
        authenticated: true,
      }),
    onSettled: settle,
  });
}
