"use client";

import { useParams } from "next/navigation";

import { AcademicSettingsPage } from "@/components/features/academic-config/academic-settings";
import { YearCopyWizard } from "@/components/features/academic-config/year-copy/year-copy-wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentCopyRun } from "@/lib/query/queries/use-year-copy";

export default function ExistingYearCopyPage() {
  const params = useParams<{ yearId: string }>();
  return (
    <AcademicSettingsPage
      title="Salin dari tahun lain"
      description="Salin pengaturan akademik dari tahun lain ke tahun ajaran Draft ini."
    >
      {() => <ExistingYearCopy yearId={params.yearId} />}
    </AcademicSettingsPage>
  );
}

// A copy run still in progress is resumed (the `?resume=1` link from the banner
// lands here too); otherwise the wizard starts at "Tahun sumber".
function ExistingYearCopy({ yearId }: { yearId: string }) {
  const run = useCurrentCopyRun(yearId);
  if (run.isLoading) return <Skeleton className="h-64 w-full" />;
  return (
    <YearCopyWizard
      key={run.data?.copy_run_id ?? "new"}
      targetYearId={yearId}
      resumeRun={run.data ?? undefined}
    />
  );
}
