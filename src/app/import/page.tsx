"use client";

import { AcademicOpsPage, ImportPanel } from "@/components/features/academic-ops/academic-ops-page";

export default function ImportPage() {
  return <AcademicOpsPage title="Import Data" description="Upload template Excel untuk siswa dan guru dengan validasi per baris.">{(ctx) => <ImportPanel {...ctx} />}</AcademicOpsPage>;
}
