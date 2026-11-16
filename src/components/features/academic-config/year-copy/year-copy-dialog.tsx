"use client";

import * as React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors/messages";
import { useCurrentCopyRun, type CopyRun } from "@/lib/query/queries/use-year-copy";

import { YearCopyWizard } from "./year-copy-wizard";

/**
 * The copy wizard as a wide modal over the Tahun Ajaran page. `targetYearId`
 * null means closed. Outside clicks are ignored so a copy is not dismissed by
 * accident; Esc and the close button still close it (an unfinished run stays
 * resumable from the page banner).
 */
export function YearCopyDialog({
  targetYearId,
  targetYearName,
  onClose,
}: {
  targetYearId: string | null;
  targetYearName?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={targetYearId !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent
        className="max-h-[90vh] max-w-5xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            Salin dari tahun lain{targetYearName ? ` — ${targetYearName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Salin pengaturan akademik dari tahun lain ke tahun ajaran Draft ini.
          </DialogDescription>
        </DialogHeader>
        {targetYearId ? (
          // Keyed by year so a captured run can never leak to another year.
          <YearCopyLoader key={targetYearId} yearId={targetYearId} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// A copy run still in progress is resumed; otherwise the wizard starts at
// "Tahun sumber". The run is captured once, after the first settled load:
// later invalidations of the copy-run query (our own start/finish) must never
// remount the wizard.
function YearCopyLoader({ yearId, onClose }: { yearId: string; onClose: () => void }) {
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
  return <YearCopyWizard targetYearId={yearId} resumeRun={initial.run} onClose={onClose} />;
}
