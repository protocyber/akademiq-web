"use client";

import { AcademicOpsPage } from "@/components/features/academic-ops/academic-ops-page";
import { HomeroomsScreen } from "@/components/features/academic-ops/homerooms-screen";
import { PermissionGuard } from "@/components/features/permission-guard";

export default function HomeroomsPage() {
  return (
    <PermissionGuard permission="academic.ops.manage">
      <AcademicOpsPage title="Kelas" description="Buat homeroom, lihat roster, dan enroll siswa.">
        {(ctx) => <HomeroomsScreen {...ctx} />}
      </AcademicOpsPage>
    </PermissionGuard>
  );
}
