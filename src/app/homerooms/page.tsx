"use client";

import { AcademicOpsPage, OpsSkeleton } from "@/components/features/academic-ops/academic-ops-page";
import { HomeroomsScreen } from "@/components/features/academic-ops/homerooms-screen";
import { PermissionGuard } from "@/components/features/permission-guard";

export default function HomeroomsPage() {
  return (
    <PermissionGuard permission="academic.ops.manage" fallback={<OpsSkeleton />}>
      <AcademicOpsPage title="Kelas" description="Buat homeroom, lihat roster, dan enroll siswa.">
        {(ctx) => <HomeroomsScreen {...ctx} />}
      </AcademicOpsPage>
    </PermissionGuard>
  );
}
