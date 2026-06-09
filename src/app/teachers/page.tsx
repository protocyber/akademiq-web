"use client";

import { AcademicOpsPage, TeachersPanel } from "@/components/features/academic-ops/academic-ops-page";

export default function TeachersPage() {
  return <AcademicOpsPage title="Guru" description="Kelola master data guru dan NIP.">{(ctx) => <TeachersPanel {...ctx} />}</AcademicOpsPage>;
}
