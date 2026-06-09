"use client";

import { AcademicOpsPage, HomeroomsPanel } from "@/components/features/academic-ops/academic-ops-page";

export default function HomeroomsPage() {
  return <AcademicOpsPage title="Kelas" description="Buat homeroom, lihat roster, dan enroll siswa.">{(ctx) => <HomeroomsPanel {...ctx} />}</AcademicOpsPage>;
}
