"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { ApiHttpError } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors/messages";
import { cn } from "@/lib/utils";
import {
  copyConfig,
  copyGrading,
  copyOps,
  useStartCopyRun,
  useUpdateCopyRun,
} from "@/lib/query/mutations/use-year-copy";
import { useAcademicYears, useTerms } from "@/lib/query/queries/use-academic-config";
import { useCopyDryRuns } from "@/lib/query/queries/use-year-copy-dry-run";
import {
  useCurrentCopyRun,
  type CopyItem,
  type CopyRun,
  type CopyStepResult,
  type CopyTermDate,
} from "@/lib/query/queries/use-year-copy";
import { STATUS_LABELS } from "@/components/features/academic-config/status-confirm-dialog";

import {
  CONFIG_ITEMS,
  DEFAULT_ITEMS,
  GRADING_ITEMS,
  OPS_ITEMS,
  resolveChecklist,
  shiftTermDates,
  type ShiftedTerm,
} from "./checklist";
import { runCopy, type CopyStep, type CopyStepState } from "./run-copy";
import { StepItems, targetHasFromResults } from "./step-items";
import { StepSource } from "./step-source";
import { StepSummary, termDatesErrorOf, type PartDef, type PartProgress } from "./step-summary";
import { StepTermDates } from "./step-term-dates";

const STEPS = [
  "Tahun sumber",
  "Data yang disalin",
  "Tanggal semester",
  "Ringkasan",
] as const;
const SOURCE = 0;
const ITEMS = 1;
const DATES = 2;
const SUMMARY = 3;

function initialProgress(run?: CopyRun): Partial<Record<CopyStep, PartProgress>> {
  if (!run) return {};
  const out: Partial<Record<CopyStep, PartProgress>> = {};
  if (run.config_result) out.config = { state: "done", result: run.config_result };
  if (run.ops_result) out.ops = { state: "done", result: run.ops_result };
  if (run.grading_result) out.grading = { state: "done", result: run.grading_result };
  return out;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type YearCopyWizardProps = {
  /** The Draft year to copy into; it is created beforehand with the year form modal. */
  targetYearId: string;
  resumeRun?: CopyRun;
  /** Closes the wizard (it lives in a modal over the Tahun Ajaran page). */
  onClose: () => void;
};

export function YearCopyWizard({ targetYearId, resumeRun, onClose }: YearCopyWizardProps) {
  const targetId = resumeRun?.target_academic_year_id ?? targetYearId;

  const [step, setStep] = React.useState<number>(resumeRun ? SUMMARY : SOURCE);
  const [maxStep, setMaxStep] = React.useState(step);
  const [sourceId, setSourceId] = React.useState<string | undefined>(
    resumeRun?.source_academic_year_id,
  );
  const [selected, setSelected] = React.useState<Set<CopyItem>>(
    () => new Set(resumeRun?.items ?? DEFAULT_ITEMS),
  );
  const [edits, setEdits] = React.useState<Record<string, { start_date?: string; end_date?: string }>>({});
  const [termDatesError, setTermDatesError] = React.useState<string | null>(null);

  // --- data -----------------------------------------------------------------
  const years = useAcademicYears();
  const yearList = React.useMemo(() => years.data ?? [], [years.data]);
  const targetYear = yearList.find((y) => y.academic_year_id === targetId);
  const targetName = targetYear?.name ?? "";
  const targetStart = targetYear?.start_date;
  const targetStatus = STATUS_LABELS[targetYear?.status ?? "Draft"] ?? targetYear?.status ?? "Draft";
  const sourceCandidates = React.useMemo(
    () =>
      yearList
        .filter((y) => y.academic_year_id !== targetId)
        .sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [yearList, targetId],
  );
  const effectiveSourceId = sourceId ?? sourceCandidates[0]?.academic_year_id;
  const sourceYear = yearList.find((y) => y.academic_year_id === effectiveSourceId);

  const dry = useCopyDryRuns(effectiveSourceId, targetId, step >= ITEMS && step <= SUMMARY);
  const configData = dry.config.data;
  const opsData = dry.ops.data;
  const gradingData = dry.grading.data;
  const targetHas = React.useMemo(
    () => targetHasFromResults({ config: configData, ops: opsData, grading: gradingData }),
    [configData, opsData, gradingData],
  );
  const rows = React.useMemo(() => resolveChecklist(selected, targetHas), [selected, targetHas]);
  const effectiveItems = React.useMemo(
    () => (resumeRun ? resumeRun.items : rows.filter((r) => r.checked).map((r) => r.item)),
    [resumeRun, rows],
  );
  const hasTerms = effectiveItems.includes("terms");

  const sourceTerms = useTerms(hasTerms ? effectiveSourceId : undefined);
  const shifted: ShiftedTerm[] = React.useMemo(() => {
    // A stored run already carries the dates the user chose; otherwise shift the source's.
    let base: ShiftedTerm[] = [];
    if (resumeRun?.term_dates && resumeRun.term_dates.length > 0) base = resumeRun.term_dates;
    else if (sourceYear && targetStart && sourceTerms.data)
      base = shiftTermDates(sourceYear.start_date, targetStart, sourceTerms.data);
    return base.map((t) => ({ ...t, ...edits[t.source_term_id] }));
  }, [resumeRun, sourceYear, targetStart, sourceTerms.data, edits]);

  const showClassesHint =
    !effectiveItems.includes("classes") &&
    ["teaching_assignments", "homeroom_teachers", "timetable"].some((i) =>
      effectiveItems.includes(i as CopyItem),
    );

  // --- run --------------------------------------------------------------------
  const startRun = useStartCopyRun(targetId);
  const updateRun = useUpdateCopyRun();
  const runRef = React.useRef<CopyRun | undefined>(resumeRun);
  const [trackRun, setTrackRun] = React.useState(Boolean(resumeRun));
  const currentRun = useCurrentCopyRun(trackRun ? targetId : undefined);
  const [progress, setProgress] = React.useState<Partial<Record<CopyStep, PartProgress>>>(
    () => initialProgress(resumeRun),
  );
  const [busy, setBusy] = React.useState(false);
  const [conflict, setConflict] = React.useState(false);
  const [startError, setStartError] = React.useState<string | null>(null);
  const [finished, setFinished] = React.useState(false);
  const needsRestart = React.useRef(false);

  const parts: PartDef[] = React.useMemo(() => {
    const items = new Set(effectiveItems);
    const pick = (owned: CopyItem[]) => owned.filter((i) => items.has(i));
    const ops = pick(OPS_ITEMS);
    const defs: PartDef[] = [
      { key: "config", label: "Struktur akademik", items: pick(CONFIG_ITEMS) },
      { key: "ops", label: "Kelas dan penugasan", items: ops.length > 0 && !ops.includes("classes") ? ["classes", ...ops] : ops },
      { key: "grading", label: "Rapor", items: pick(GRADING_ITEMS) },
    ];
    return defs.filter((p) => p.items.length > 0);
  }, [effectiveItems]);

  const executing = React.useRef(false);
  const startingRef = React.useRef(false);

  async function execute(run: CopyRun) {
    if (executing.current) return;
    executing.current = true;
    try {
      await executeRun(run);
    } finally {
      executing.current = false;
    }
  }

  async function executeRun(run: CopyRun) {
    runRef.current = run;
    setProgress(initialProgress(run));
    setFinished(false);
    let errored = false;
    await runCopy(
      run,
      {
        copyConfig,
        copyOps,
        copyGrading,
        updateRun: (input) => updateRun.mutateAsync({ copyRunId: run.copy_run_id, ...input }),
        sleep,
      },
      (part: CopyStep, state: CopyStepState, payload) => {
        if (state === "error") {
          errored = true;
          const error = payload && "error" in payload ? payload.error : undefined;
          setProgress((p) => ({ ...p, [part]: { state, error } }));
          if (termDatesErrorOf(error)) {
            needsRestart.current = true;
            setTermDatesError(getErrorMessage(error));
          }
        } else {
          setProgress((p) => ({
            ...p,
            [part]: { state, result: state === "done" ? (payload as CopyStepResult) : p[part]?.result },
          }));
        }
      },
    );
    if (!errored) {
      setFinished(true);
      toast.success("Penyalinan selesai.");
    }
  }

  async function onStart() {
    if (!effectiveSourceId || !targetId || executing.current || startingRef.current) return;
    startingRef.current = true;
    setBusy(true);
    setStartError(null);
    setConflict(false);
    try {
      if (runRef.current && !needsRestart.current) {
        await execute(runRef.current);
        return;
      }
      if (runRef.current && needsRestart.current) {
        try {
          await updateRun.mutateAsync({ copyRunId: runRef.current.copy_run_id, status: "cancelled" });
        } catch (err) {
          setStartError(getErrorMessage(err, { fallback: "Tidak bisa memulai penyalinan." }));
          return;
        }
        needsRestart.current = false;
        runRef.current = undefined;
      }
      let run: CopyRun;
      try {
        const termDates: CopyTermDate[] | undefined = hasTerms
          ? shifted.map((t) => ({
              source_term_id: t.source_term_id,
              name: t.name,
              start_date: t.start_date,
              end_date: t.end_date,
            }))
          : undefined;
        run = await startRun.mutateAsync({
          source_academic_year_id: effectiveSourceId,
          items: effectiveItems,
          ...(termDates && termDates.length > 0 ? { term_dates: termDates } : {}),
        });
      } catch (err) {
        if (err instanceof ApiHttpError && err.code === "COPY_RUN_IN_PROGRESS") {
          setConflict(true);
          setTrackRun(true);
          setStartError(getErrorMessage(err));
        } else {
          setStartError(getErrorMessage(err, { fallback: "Tidak bisa memulai penyalinan." }));
        }
        return;
      }
      setTrackRun(true);
      await execute(run);
    } finally {
      startingRef.current = false;
      setBusy(false);
    }
  }

  async function onRetry() {
    setBusy(true);
    try {
      const latest = trackRun ? (await currentRun.refetch()).data : undefined;
      const run = latest ?? runRef.current;
      if (run) await execute(run);
    } finally {
      setBusy(false);
    }
  }

  async function onResumeExisting() {
    setBusy(true);
    try {
      const run = currentRun.data ?? (await currentRun.refetch()).data;
      if (!run) {
        setStartError("Penyalinan sebelumnya tidak ditemukan.");
        return;
      }
      setConflict(false);
      setStartError(null);
      await execute(run);
    } finally {
      setBusy(false);
    }
  }

  const running = Object.values(progress).some((p) => p?.state === "running" || p?.state === "waiting");

  // --- navigation -------------------------------------------------------------
  function goTo(next: number) {
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
  }

  // A resumed run opens at the summary; it may only go back to the dates after a term_dates error.
  const canBack =
    !running &&
    !finished &&
    (resumeRun
      ? hasTerms && termDatesError !== null && (step === SUMMARY || step === DATES)
      : step > SOURCE);

  function back() {
    if (resumeRun) goTo(SUMMARY);
    else if (step === SUMMARY) goTo(hasTerms ? DATES : ITEMS);
    else goTo(step - 1);
  }

  function next() {
    if (step === SOURCE) goTo(ITEMS);
    else if (step === ITEMS) goTo(hasTerms ? DATES : SUMMARY);
    else if (step === DATES) {
      setTermDatesError(null);
      goTo(SUMMARY);
    }
  }

  const nextDisabled =
    (step === SOURCE && !effectiveSourceId) ||
    (step === ITEMS && effectiveItems.length === 0) ||
    (step === DATES && shifted.some((t) => !t.start_date || !t.end_date));

  const isResume = Boolean(resumeRun) || Object.keys(progress).length > 0;
  const startLabel = isResume ? "Lanjutkan" : "Mulai salin";

  const stepState = (i: number): "done" | "current" | "skipped" | "todo" => {
    if (i === step) return "current";
    if (i === DATES && !hasTerms && maxStep >= ITEMS && (step > DATES || i < maxStep)) return "skipped";
    return i < step || (resumeRun && i < SUMMARY) ? "done" : "todo";
  };

  const loadingYears = years.isLoading;

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="space-y-4 md:border-r md:pr-4">
        <ol className="space-y-1" aria-label="Langkah penyalinan">
          {STEPS.map((label, i) => {
            const state = stepState(i);
            return (
              <li
                key={label}
                aria-current={state === "current" ? "step" : undefined}
                data-state={state}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                  state === "current" && "bg-muted font-semibold text-foreground",
                  state === "done" && "text-muted-foreground",
                  state === "skipped" && "text-muted-foreground/60 line-through",
                  state === "todo" && "text-muted-foreground/70",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    state === "done" && "border-primary bg-primary text-primary-foreground",
                    state === "current" && "border-primary text-primary",
                  )}
                >
                  {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
        <p className="px-3 text-xs text-muted-foreground" data-testid="year-context">
          Tujuan: {targetName || "—"} ({targetStatus}) · Sumber: {sourceYear?.name ?? "—"}
        </p>
      </aside>

      <section className="min-w-0 space-y-6" aria-label={STEPS[step]}>
        <h3 className="text-base font-semibold">{STEPS[step]}</h3>
          {loadingYears ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : step === SOURCE ? (
            <StepSource
              years={sourceCandidates}
              isLoading={false}
              value={effectiveSourceId}
              onChange={setSourceId}
              onStartEmpty={onClose}
            />
          ) : step === ITEMS ? (
            <StepItems
              rows={rows}
              dry={dry}
              showClassesHint={showClassesHint}
              onToggle={(item, checked) =>
                setSelected((prev) => {
                  const nextSet = new Set(prev);
                  if (checked) nextSet.add(item);
                  else nextSet.delete(item);
                  return nextSet;
                })
              }
            />
          ) : step === DATES ? (
            <StepTermDates
              terms={shifted}
              isLoading={sourceTerms.isLoading}
              error={termDatesError}
              onChange={(id, patch) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }))}
            />
          ) : (
            <StepSummary
              sourceName={sourceYear?.name ?? "—"}
              targetName={targetName || "—"}
              parts={parts}
              dry={dry}
              progress={progress}
              conflict={conflict}
              finished={finished}
              busy={busy}
              onRetry={() => void onRetry()}
              onResumeExisting={() => void onResumeExisting()}
              onBackToTermDates={() => goTo(DATES)}
              onClose={onClose}
            />
          )}

          {startError && !conflict ? (
            <Alert variant="destructive">
              <AlertDescription>{startError}</AlertDescription>
            </Alert>
          ) : null}

          {!finished ? (
            <div className="flex items-center justify-between border-t pt-4">
              <Button type="button" variant="outline" onClick={back} disabled={!canBack}>
                ← Kembali
              </Button>
              {step === SUMMARY ? (
                <Button
                  type="button"
                  onClick={() => void onStart()}
                  loading={busy || running}
                  disabled={parts.length === 0 || conflict}
                >
                  {startLabel}
                </Button>
              ) : (
                <Button type="button" onClick={next} disabled={nextDisabled}>
                  Lanjut →
                </Button>
              )}
            </div>
          ) : null}
      </section>
    </div>
  );
}
