"use client";

import { AcademicOpsPage, TeachingAssignmentsPanel } from "@/components/features/academic-ops/academic-ops-page";

export default function TeachingAssignmentsPage() {
  return <AcademicOpsPage title="Penugasan Mengajar" description="Assign guru ke subject dan kelas untuk tahun ajaran aktif.">{(ctx) => <TeachingAssignmentsPanel {...ctx} />}</AcademicOpsPage>;
}
