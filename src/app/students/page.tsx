"use client";

import { AcademicOpsPage, OpsSkeleton } from "@/components/features/academic-ops/academic-ops-page";
import { StudentsScreen } from "@/components/features/academic-ops/students-screen";
import { PermissionGuard } from "@/components/features/permission-guard";

export default function StudentsPage() {
  return (
    <PermissionGuard permission="academic.ops.manage" fallback={<OpsSkeleton />}>
      <AcademicOpsPage title="Siswa" description="Kelola master data siswa dan identitas NIS.">
        {(ctx) => <StudentsScreen {...ctx} />}
      </AcademicOpsPage>
    </PermissionGuard>
  );
}
