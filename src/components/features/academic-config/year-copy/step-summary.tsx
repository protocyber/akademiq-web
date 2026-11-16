"use client";

import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors/messages";
import {
  stepItemResults,
  type CopyItem,
  type CopyItemResult,
  type CopyStepResult,
} from "@/lib/query/queries/use-year-copy";
import type { CopyStep, CopyStepState } from "./run-copy";

import { ITEM_LABELS } from "./checklist";
import { itemInfo, type DryRuns } from "./step-items";

export type PartProgress = {
  state: CopyStepState;
  result?: CopyItemResult[] | CopyStepResult | null;
  error?: unknown;
};

export type PartDef = { key: CopyStep; label: string; items: CopyItem[] };

export function sumResult(result?: CopyItemResult[] | CopyStepResult | null) {
  return stepItemResults(result).reduce(
    (acc, r) => ({ copied: acc.copied + r.copied, skipped: acc.skipped + r.skipped }),
    { copied: 0, skipped: 0 },
  );
}

function partStatus(p?: PartProgress): string {
  if (!p) return "Belum dimulai";
  if (p.state === "running") return "Menyalin…";
  if (p.state === "waiting") return "Menunggu data…";
  if (p.state === "done") {
    const { copied, skipped } = sumResult(p.result);
    return `${copied} disalin, ${skipped} dilewati`;
  }
  return "Gagal";
}

export function termDatesErrorOf(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "fields" in error && (error as { fields?: Record<string, unknown> }).fields?.term_dates,
  );
}

export function StepSummary({
  sourceName,
  targetName,
  parts,
  dry,
  progress,
  conflict,
  finished,
  onRetry,
  onResumeExisting,
  onBackToTermDates,
  onClose,
  busy,
}: {
  sourceName: string;
  targetName: string;
  parts: PartDef[];
  dry: DryRuns;
  progress: Partial<Record<CopyStep, PartProgress>>;
  conflict: boolean;
  finished: boolean;
  onClose: () => void;
  onRetry: () => void;
  onResumeExisting: () => void;
  onBackToTermDates: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Akan disalin dari <span className="font-medium text-foreground">{sourceName}</span> ke{" "}
        <span className="font-medium text-foreground">{targetName}</span>. Data yang sudah ada
        dilewati.
      </p>

      {conflict ? (
        <Alert variant="destructive">
          <AlertTitle>Penyalinan sebelumnya belum selesai</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{getErrorMessage({ code: "COPY_RUN_IN_PROGRESS" })}</p>
            <Button type="button" size="sm" variant="outline" loading={busy} onClick={onResumeExisting}>
              Lanjutkan penyalinan sebelumnya
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <ul className="divide-y rounded-lg border">
        {parts.map((part) => {
          const p = progress[part.key];
          const failed = p?.state === "error";
          const termDates = failed && termDatesErrorOf(p?.error);
          return (
            <li key={part.key} className="space-y-1 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{part.label}</p>
                <span
                  data-testid={`part-${part.key}`}
                  className={failed ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
                >
                  {partStatus(p)}
                </span>
              </div>
              <ul className="text-xs text-muted-foreground">
                {part.items.map((item) => {
                  const info = itemInfo(item, dry);
                  return (
                    <li key={item}>
                      {ITEM_LABELS[item]}
                      {info.source !== undefined ? ` · ${info.source} di sumber` : ""}
                    </li>
                  );
                })}
              </ul>
              {failed ? (
                <div className="space-y-2 pt-1">
                  <p role="alert" className="text-sm text-destructive">
                    {getErrorMessage(p?.error, { fallback: "Penyalinan gagal." })}
                  </p>
                  {termDates ? (
                    <Button type="button" size="sm" variant="outline" onClick={onBackToTermDates}>
                      Kembali ke Tanggal semester
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" loading={busy} onClick={onRetry}>
                      Coba lagi
                    </Button>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {finished ? (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Penyalinan selesai
          </AlertTitle>
          <AlertDescription>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onClose}>
              Tutup
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
