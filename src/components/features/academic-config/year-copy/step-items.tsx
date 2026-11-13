"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors/messages";
import type { CopyItem, CopyStepResult } from "@/lib/query/queries/use-year-copy";

import { ITEM_LABELS, type ChecklistRow } from "./checklist";

export type DryRuns = {
  config: UseQueryResult<CopyStepResult>;
  ops: UseQueryResult<CopyStepResult>;
  grading: UseQueryResult<CopyStepResult>;
};

type Service = keyof DryRuns;

/** Services that report an item, most authoritative first. */
const OWNERS: Record<CopyItem, Service[]> = {
  terms: ["config"],
  grade_levels: ["config"],
  classes: ["ops", "config"],
  homeroom_teachers: ["ops"],
  curriculum: ["config"],
  grading_policy: ["config"],
  report_types: ["grading"],
  evaluation_weights: ["grading"],
  teaching_assignments: ["ops"],
  timetable: ["ops"],
};

export type ItemInfo = {
  loading: boolean;
  source?: number;
  targetExisting?: number;
  error?: string;
};

export function itemInfo(item: CopyItem, dry: DryRuns): ItemInfo {
  let error: string | undefined;
  let loading = false;
  for (const service of OWNERS[item]) {
    const q = dry[service];
    const row = q.data?.results.find((r) => r.item === item);
    if (row) return { loading: false, source: row.source, targetExisting: row.target_existing };
    if (q.isError) error ??= getErrorMessage(q.error, { fallback: "Tidak bisa memuat jumlah data." });
    else if (q.isLoading || q.isFetching) loading = true;
  }
  if (loading) return { loading: true };
  return { loading: false, error };
}

export function targetHasFromDry(dry: DryRuns): Partial<Record<CopyItem, boolean>> {
  const out: Partial<Record<CopyItem, boolean>> = {};
  for (const item of Object.keys(OWNERS) as CopyItem[]) {
    out[item] = (itemInfo(item, dry).targetExisting ?? 0) > 0;
  }
  return out;
}

const GROUPS: { title: string; items: CopyItem[] }[] = [
  { title: "Struktur sekolah", items: ["terms", "grade_levels", "classes", "homeroom_teachers"] },
  { title: "Kurikulum", items: ["curriculum", "grading_policy"] },
  { title: "Rapor", items: ["report_types", "evaluation_weights"] },
  { title: "Penugasan", items: ["teaching_assignments", "timetable"] },
];

export function StepItems({
  rows,
  dry,
  onToggle,
  showClassesHint,
}: {
  rows: ChecklistRow[];
  dry: DryRuns;
  onToggle: (item: CopyItem, checked: boolean) => void;
  showClassesHint: boolean;
}) {
  const byItem = new Map(rows.map((r) => [r.item, r]));
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Pilih data yang disalin. Data yang sudah ada di tahun tujuan dilewati, tidak ditimpa.
        Angka menunjukkan jumlah di tahun sumber.
      </p>
      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
          <ul className="divide-y rounded-lg border">
            {group.items.map((item) => {
              const row = byItem.get(item);
              if (!row) return null;
              const info = itemInfo(item, dry);
              return (
                <li key={item} className="flex items-center gap-3 px-3 py-2.5">
                  <Checkbox
                    id={`copy-item-${item}`}
                    aria-label={ITEM_LABELS[item]}
                    checked={row.checked}
                    disabled={row.disabled}
                    onCheckedChange={(v) => onToggle(item, v === true)}
                  />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`copy-item-${item}`} className="cursor-pointer">
                      {ITEM_LABELS[item]}
                    </Label>
                    {row.reason ? (
                      <p className="text-xs text-muted-foreground">{row.reason}</p>
                    ) : null}
                    {info.error ? <p className="text-xs text-destructive">{info.error}</p> : null}
                  </div>
                  {info.loading ? (
                    <Skeleton className="h-5 w-8" />
                  ) : info.source !== undefined ? (
                    <span
                      data-testid={`count-${item}`}
                      className="text-sm font-medium tabular-nums text-foreground"
                    >
                      {info.source}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {showClassesHint ? (
        <p className="text-sm text-muted-foreground">
          Kelas yang belum ada di tahun tujuan akan ikut dibuat.
        </p>
      ) : null}
    </div>
  );
}
