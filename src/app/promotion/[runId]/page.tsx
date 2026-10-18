"use client";

import { useParams } from "next/navigation";

import { PromotionPage } from "@/components/features/promotion/promotion-page";
import { RunDetail } from "@/components/features/promotion/run-detail";

export default function PromotionRunPage() {
  const params = useParams<{ runId: string }>();
  return (
    <PromotionPage title="Kenaikan Kelas" description="Detail evaluasi kenaikan kelas.">
      {(access) => <RunDetail runId={params.runId} access={access} />}
    </PromotionPage>
  );
}
