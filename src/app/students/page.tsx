"use client";

import { AcademicOpsPage } from "@/components/features/academic-ops/academic-ops-page";
import { StudentsScreen } from "@/components/features/academic-ops/students-screen";

export default function StudentsPage() {
  return (
    <AcademicOpsPage title="Siswa" description="Kelola master data siswa dan identitas NIS.">
      {(ctx) => <StudentsScreen {...ctx} />}
    </AcademicOpsPage>
  );
}
