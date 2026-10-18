"use client";

import { PromotionPage } from "@/components/features/promotion/promotion-page";
import { RunsScreen } from "@/components/features/promotion/runs-screen";

export default function PromotionRunsPage() {
  return (
    <PromotionPage title="Kenaikan Kelas" description="Evaluasi kenaikan kelas per tahun ajaran.">
      {(access) => <RunsScreen canManage={access.canManage} />}
    </PromotionPage>
  );
}
