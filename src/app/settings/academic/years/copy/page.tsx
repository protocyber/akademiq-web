"use client";

import { AcademicSettingsPage } from "@/components/features/academic-config/academic-settings";
import { CopyAdminOnly, canCopyYear } from "@/components/features/academic-config/year-copy/copy-admin-only";
import { YearCopyWizard } from "@/components/features/academic-config/year-copy/year-copy-wizard";

export default function NewYearCopyPage() {
  return (
    <AcademicSettingsPage
      title="Tahun ajaran baru"
      description="Buat tahun ajaran baru dan salin pengaturannya dari tahun lain."
    >
      {({ canManageAcademicConfig }) =>
        canCopyYear(canManageAcademicConfig) ? <YearCopyWizard /> : <CopyAdminOnly />
      }
    </AcademicSettingsPage>
  );
}
