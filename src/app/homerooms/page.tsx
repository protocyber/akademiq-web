"use client";

import { AcademicOpsPage } from "@/components/features/academic-ops/academic-ops-page";
import { HomeroomsScreen } from "@/components/features/academic-ops/homerooms-screen";

export default function HomeroomsPage() {
  return (
    <AcademicOpsPage title="Daftar Kelas" description="Buat homeroom, lihat roster, dan enroll siswa.">
      {(ctx) => <HomeroomsScreen {...ctx} />}
    </AcademicOpsPage>
  );
}
