"use client";

import { AcademicOpsPage, StudentsPanel } from "@/components/features/academic-ops/academic-ops-page";

export default function StudentsPage() {
  return <AcademicOpsPage title="Siswa" description="Kelola master data siswa dan identitas NIS.">{(ctx) => <StudentsPanel {...ctx} />}</AcademicOpsPage>;
}
