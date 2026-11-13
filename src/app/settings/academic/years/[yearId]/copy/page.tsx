"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { AcademicSettingsPage } from "@/components/features/academic-config/academic-settings";
import { YearCopyWizard } from "@/components/features/academic-config/year-copy/year-copy-wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentCopyRun, type CopyRun } from "@/lib/query/queries/use-year-copy";

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
// lands here too); otherwise the wizard starts at "Tahun sumber". The run is
// captured once, after the first settled load: later invalidations of the
// copy-run query (our own start/finish) must never remount the wizard.
function ExistingYearCopy({ yearId }: { yearId: string }) {
  const run = useCurrentCopyRun(yearId);
  const [initial, setInitial] = React.useState<{ run: CopyRun | undefined } | null>(null);
  // Set during render (not in an effect) so the first settled value is captured exactly once.
  if (!initial && !run.isLoading) setInitial({ run: run.data ?? undefined });
  if (!initial) return <Skeleton className="h-64 w-full" />;
  return <YearCopyWizard key={yearId} targetYearId={yearId} resumeRun={initial.run} />;
}
