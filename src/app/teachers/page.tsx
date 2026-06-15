"use client";

import { AcademicOpsPage } from "@/components/features/academic-ops/academic-ops-page";
import { TeachersScreen } from "@/components/features/academic-ops/teachers-screen";

export default function TeachersPage() {
  return (
    <AcademicOpsPage title="Guru" description="Kelola master data guru, NIP, dan akun login.">
      {(ctx) => <TeachersScreen {...ctx} />}
    </AcademicOpsPage>
  );
}
