"use client";

import { AcademicOpsPage } from "@/components/features/academic-ops/academic-ops-page";
import { TeachingAssignmentsScreen } from "@/components/features/academic-ops/teaching-assignments-screen";

export default function TeachingAssignmentsPage() {
  return (
    <AcademicOpsPage title="Penugasan Mengajar" description="Assign guru ke mata pelajaran dan kelas untuk tahun ajaran aktif.">
      {(ctx) => <TeachingAssignmentsScreen {...ctx} />}
    </AcademicOpsPage>
  );
}
