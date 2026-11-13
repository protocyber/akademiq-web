"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { AcademicSettingsPage } from "@/components/features/academic-config/academic-settings";
import { YearCopyWizard } from "@/components/features/academic-config/year-copy/year-copy-wizard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors/messages";
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
  // Keyed by year so the captured run can never leak across a param change.
  return <ExistingYearCopyInner key={yearId} yearId={yearId} />;
}

function ExistingYearCopyInner({ yearId }: { yearId: string }) {
  const run = useCurrentCopyRun(yearId);
  const [initial, setInitial] = React.useState<{ run: CopyRun | undefined } | null>(null);
  // Set during render (not in an effect) so the first successful value is captured exactly once.
  const loaded = !run.isLoading && !run.isError;
  if (!initial && loaded) setInitial({ run: run.data ?? undefined });
  if (!initial && run.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{getErrorMessage(run.error)}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void run.refetch()}>
            Coba lagi
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (!initial) return <Skeleton className="h-64 w-full" />;
  return <YearCopyWizard key={yearId} targetYearId={yearId} resumeRun={initial.run} />;
}
