"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useEvaluations,
  useReportFormulasForTypes,
  useReportTypes,
  type Evaluation,
} from "@/lib/query/queries/use-grading";

export type WeightMatrixReportType = { report_type_id: string; code: string };

/**
 * Shared presentational weight grid: evaluations (rows) × report types
 * (columns), each cell holding a stored weight percent. Renders column totals
 * and flags any report type whose weights do not total 100%.
 *
 * In editable mode cells are number inputs driven by the parent's `weights`
 * state via `onWeightChange`; in `readOnly` mode cells are plain text and no
 * inputs or save controls are rendered.
 */
export function WeightMatrixGrid({
  evaluations,
  reportTypes,
  weights,
  readOnly = false,
  onWeightChange,
}: {
  evaluations: Evaluation[];
  reportTypes: WeightMatrixReportType[];
  weights: Record<string, Record<string, number>>;
  readOnly?: boolean;
  onWeightChange?: (reportTypeId: string, evaluationId: string, raw: string) => void;
}) {
  const columnTotal = React.useCallback(
    (reportTypeId: string) =>
      Object.entries(weights[reportTypeId] ?? {}).reduce(
        (sum, [, value]) => sum + (Number.isFinite(value) ? value : 0),
        0,
      ),
    [weights],
  );

  const driftedTypes = reportTypes.filter(
    (type) => Math.abs(columnTotal(type.report_type_id) - 100) >= 1e-9,
  );

  return (
    <div className="space-y-2">
      {driftedTypes.length > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Bobot {driftedTypes.map((type) => type.code).join(", ")} belum berjumlah 100%. Nilai tetap bisa diisi, tetapi
          skor rapor dapat kosong sampai bobot diperbaiki.
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Evaluasi</th>
              {reportTypes.map((rt) => (
                <th
                  key={rt.report_type_id}
                  className="px-3 py-2 text-center text-xs font-semibold uppercase text-muted-foreground"
                >
                  {rt.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evaluations.map((ev, index) => (
              <tr
                key={ev.evaluation_id}
                className={cn("border-t", index % 2 === 0 ? "bg-muted/60 dark:bg-background/35" : "bg-background")}
              >
                <td className="px-3 py-2 font-medium">{ev.code}</td>
                {reportTypes.map((rt) => {
                  const value = weights[rt.report_type_id]?.[ev.evaluation_id];
                  return (
                    <td key={rt.report_type_id} className="px-2 py-2 text-center">
                      {readOnly ? (
                        <span className="text-sm tabular-nums">
                          {value != null ? (
                            `${value}%`
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </span>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={value ?? ""}
                          onChange={(e) => onWeightChange?.(rt.report_type_id, ev.evaluation_id, e.target.value)}
                          className="h-8 w-20 text-center text-sm"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t bg-muted/30">
              <td className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Total</td>
              {reportTypes.map((rt) => {
                const total = columnTotal(rt.report_type_id);
                const valid = Math.abs(total - 100) < 1e-9;
                return (
                  <td key={rt.report_type_id} className="px-3 py-2 text-center">
                    <span className={valid ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-destructive"}>
                      {total}%
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Read-only evaluation + weight matrix for a single assignment. Fetches
 * evaluations, report types, and per-type formula weights (lazily — only runs
 * once mounted, i.e. when the consumer's row is expanded) and renders
 * {@link WeightMatrixGrid} without any edit or save controls. Handles empty
 * states (no active term, no report types, no evaluations) with guidance text.
 */
export function ReadOnlyEvaluationMatrix({
  homeroomId,
  subjectId,
  yearId,
  termId,
}: {
  homeroomId: string;
  subjectId: string;
  yearId: string;
  termId?: string;
}) {
  if (!termId) {
    return (
      <MatrixEmptyState>
        Belum ada semester aktif. Pilih semester di header untuk melihat matriks evaluasi.
      </MatrixEmptyState>
    );
  }
  return (
    <ReadOnlyEvaluationMatrixData
      homeroomId={homeroomId}
      subjectId={subjectId}
      yearId={yearId}
      termId={termId}
    />
  );
}

function ReadOnlyEvaluationMatrixData({
  homeroomId,
  subjectId,
  yearId,
  termId,
}: {
  homeroomId: string;
  subjectId: string;
  yearId: string;
  termId: string;
}) {
  const evaluations = useEvaluations(homeroomId, subjectId, yearId, termId);
  const reportTypes = useReportTypes(yearId, termId);
  const reportTypeIds = (reportTypes.data ?? []).map((t) => t.report_type_id);
  const formulasByType = useReportFormulasForTypes(reportTypeIds);

  const weights = React.useMemo(() => {
    const next: Record<string, Record<string, number>> = {};
    const evalIds = new Set((evaluations.data ?? []).map((e) => e.evaluation_id));
    for (const [reportTypeId, rows] of formulasByType.data ?? new Map()) {
      const map: Record<string, number> = {};
      for (const row of rows) {
        if (evalIds.has(row.evaluation_id)) map[row.evaluation_id] = row.weight;
      }
      next[reportTypeId] = map;
    }
    return next;
  }, [formulasByType.data, evaluations.data]);

  if (evaluations.isLoading || reportTypes.isLoading || formulasByType.isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if ((reportTypes.data ?? []).length === 0) {
    return <MatrixEmptyState>Belum ada jenis rapor untuk semester ini.</MatrixEmptyState>;
  }

  if ((evaluations.data ?? []).length === 0) {
    return <MatrixEmptyState>Belum ada evaluasi untuk kelas dan mapel ini.</MatrixEmptyState>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bobot per Jenis Rapor</p>
      <WeightMatrixGrid
        evaluations={evaluations.data ?? []}
        reportTypes={reportTypes.data ?? []}
        weights={weights}
        readOnly
      />
    </div>
  );
}

function MatrixEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">{children}</p>
  );
}
