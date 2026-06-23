"use client";

import { AcademicOpsPage } from "@/components/features/academic-ops/academic-ops-page";
import { TeachersScreen } from "@/components/features/academic-ops/teachers-screen";
import { PermissionGuard } from "@/components/features/permission-guard";

export default function TeachersPage() {
  return (
    <PermissionGuard permission="academic.ops.manage">
      <AcademicOpsPage title="Guru" description="Kelola master data guru, NIP, dan akun login.">
        {(ctx) => <TeachersScreen {...ctx} />}
      </AcademicOpsPage>
    </PermissionGuard>
  );
}
