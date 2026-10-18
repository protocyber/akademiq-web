"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CriteriaDialog } from "@/components/features/promotion/criteria-dialog";
import { STATUS_LABEL, statusBadgeVariant } from "@/components/features/promotion/labels";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Combobox } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import { formatDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/errors/messages";
import { useAcademicYears } from "@/lib/query/queries/use-academic-config";
import { usePromotionRuns } from "@/lib/query/queries/use-promotion";

export function RunsScreen({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const scope = useAcademicScope();
  const years = useAcademicYears();
  const [yearId, setYearId] = React.useState<string | undefined>(scope.yearId ?? undefined);
  React.useEffect(() => {
    if (!yearId && scope.yearId) setYearId(scope.yearId);
  }, [scope.yearId, yearId]);
  const runs = usePromotionRuns(yearId);
  const [creating, setCreating] = React.useState(false);

  const openRun = (runs.data ?? []).find((r) => r.status !== "executed");
  const yearOptions = (years.data ?? []).map((y) => ({ value: y.academic_year_id, label: y.name }));

  return (
    <DataTableCard
      title="Kenaikan Kelas"
      description="Evaluasi kenaikan kelas per tahun ajaran."
      primaryActions={
        canManage && yearId ? (
          openRun ? (
            <Button asChild variant="outline">
              <Link href={`/promotion/${openRun.run_id}`}>Buka evaluasi berjalan</Link>
            </Button>
          ) : (
            <Button onClick={() => setCreating(true)}>Buat evaluasi</Button>
          )
        ) : null
      }
      toolbar={{
        filters: (
          <Combobox
            items={yearOptions}
            value={yearId ?? ""}
            onValueChange={(value) => setYearId(value || undefined)}
            placeholder="Pilih tahun ajaran"
            isLoading={years.isLoading}
            aria-label="Tahun ajaran"
            className="w-full sm:w-56"
          />
        ),
      }}
    >
      <div className="px-4 pb-4">
        {runs.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : runs.error ? (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(runs.error, { fallback: "Tidak bisa memuat evaluasi." })}</AlertDescription>
          </Alert>
        ) : (runs.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Belum ada evaluasi untuk tahun ajaran ini.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dibuat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dieksekusi</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(runs.data ?? []).map((run) => (
                <TableRow key={run.run_id}>
                  <TableCell>{formatDate(run.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(run.status)}>{STATUS_LABEL[run.status]}</Badge>
                  </TableCell>
                  <TableCell>{run.executed_at ? formatDate(run.executed_at) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/promotion/${run.run_id}`}>Lihat</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <CriteriaDialog
        open={creating}
        onOpenChange={setCreating}
        mode="create"
        academicYearId={yearId}
        existingRunId={openRun?.run_id}
        onCreated={(runId) => router.push(`/promotion/${runId}`)}
      />
    </DataTableCard>
  );
}
