"use client";

import * as React from "react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { useUpdateCopyRun } from "@/lib/query/mutations/use-year-copy";
import { type CopyRun, useCurrentCopyRun } from "@/lib/query/queries/use-year-copy";

import { CONFIG_ITEMS, GRADING_ITEMS, OPS_ITEMS } from "./checklist";

/** Parts (config / ops / grading) a run touches, and how many already have a result. */
function countParts(run: CopyRun) {
  const parts = [
    { items: CONFIG_ITEMS, result: run.config_result },
    { items: OPS_ITEMS, result: run.ops_result },
    { items: GRADING_ITEMS, result: run.grading_result },
  ].filter((p) => run.items.some((i) => p.items.includes(i)));
  return { total: parts.length, done: parts.filter((p) => p.result != null).length };
}

/**
 * Shown above the years table for a Draft year with an in-progress copy run.
 * Renders nothing while loading or when there is no run.
 */
export function CopyRunResumeBanner({
  targetYearId,
  targetYearName,
  sourceYearName,
  resolveYearName,
}: {
  targetYearId: string;
  targetYearName: string;
  /** Overrides the lookup of the run's source year. */
  sourceYearName?: string;
  /** Looks the source year name up by id when `sourceYearName` is not given. */
  resolveYearName?: (yearId: string) => string | undefined;
}) {
  const current = useCurrentCopyRun(targetYearId);
  const updateRun = useUpdateCopyRun();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const run = current.data;

  if (current.isLoading || !run) return null;

  const { done, total } = countParts(run);
  const source =
    sourceYearName ?? resolveYearName?.(run.source_academic_year_id) ?? "tahun sumber";

  async function onCancel() {
    if (!run) return;
    try {
      await updateRun.mutateAsync({ copyRunId: run.copy_run_id, status: "cancelled" });
      toast.success("Penyalinan dibatalkan.");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa membatalkan penyalinan." }));
    }
  }

  return (
    <>
      <Alert>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {`Penyalinan dari ${source} belum selesai (${done} dari ${total} bagian)`}
          </span>
          <span className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link
                href={`/settings/academic/years/${targetYearId}/copy`}
                aria-label="Lanjutkan"
              >
                Lanjutkan
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)}>
              Batalkan
            </Button>
          </span>
        </AlertDescription>
      </Alert>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Batalkan penyalinan ke ${targetYearName}?`}
        description="Data yang sudah tersalin tetap ada. Anda bisa memulai penyalinan baru kapan saja."
        confirmLabel="Ya, batalkan"
        loadingLabel="Membatalkan..."
        loading={updateRun.isPending}
        destructive
        onConfirm={onCancel}
      />
    </>
  );
}
