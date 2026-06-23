"use client";

import { AcademicOpsPage } from "@/components/features/academic-ops/academic-ops-page";
import { TeachingAssignmentsScreen } from "@/components/features/academic-ops/teaching-assignments-screen";
import { PermissionGuard } from "@/components/features/permission-guard";

export default function TeachingAssignmentsPage() {
  return (
    <PermissionGuard permission="academic.ops.manage">
      <AcademicOpsPage title="Penugasan Mengajar" description="Assign guru ke mata pelajaran dan kelas untuk tahun ajaran aktif.">
        {(ctx) => <TeachingAssignmentsScreen {...ctx} />}
      </AcademicOpsPage>
    </PermissionGuard>
  );
}
