"use client";

import * as React from "react";
import Link from "next/link";

import { ActionBar } from "@/components/features/promotion/action-bar";
import { CannotEvaluateTab } from "@/components/features/promotion/cannot-evaluate-tab";
import { CriteriaDialog } from "@/components/features/promotion/criteria-dialog";
import { DecisionsTab } from "@/components/features/promotion/decisions-tab";
import { ExecuteDialog } from "@/components/features/promotion/execute-dialog";
import { STATUS_LABEL, STATUS_ORDER, statusBadgeVariant } from "@/components/features/promotion/labels";
import { formatScore } from "@/components/features/promotion/override-dialog";
import { PlacementTab } from "@/components/features/promotion/placement-tab";
import type { PromotionAccess } from "@/components/features/promotion/promotion-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiHttpError } from "@/lib/api/types";
import { formatDateTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/errors/messages";
import { useAcademicYears } from "@/lib/query/queries/use-academic-config";
import { useHomeroomsForYear } from "@/lib/query/queries/use-academic-ops";
import { usePromotionDecisions, usePromotionRun } from "@/lib/query/queries/use-promotion";

function Who({ id, userId }: { id: string | null; userId: string | null }) {
  if (!id) return null;
  return <>{id === userId ? " oleh Anda" : ""}</>;
}

export function RunDetail({ runId, access }: { runId: string; access: PromotionAccess }) {
  const detail = usePromotionRun(runId);
  const decisions = usePromotionDecisions(runId);
  const years = useAcademicYears();
  const targetHomerooms = useHomeroomsForYear(detail.data?.run.target_academic_year_id ?? undefined);
  const [reevaluating, setReevaluating] = React.useState(false);
  const [executing, setExecuting] = React.useState(false);
  const [tab, setTab] = React.useState("decisions");
  const [unsavedPlacement, setUnsavedPlacement] = React.useState(false);

  if (detail.isLoading) {
    return (
      <div className="space-y-3 px-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (detail.error instanceof ApiHttpError && detail.error.status === 404) {
    return (
      <Alert className="mx-6">
        <AlertTitle>Evaluasi tidak ditemukan</AlertTitle>
        <AlertDescription>
          <Link href="/promotion" className="underline">
            Kembali ke daftar evaluasi
          </Link>
        </AlertDescription>
      </Alert>
    );
  }
  if (detail.error || !detail.data) {
    return (
      <Alert variant="destructive" className="mx-6">
        <AlertDescription>{getErrorMessage(detail.error, { fallback: "Tidak bisa memuat evaluasi." })}</AlertDescription>
      </Alert>
    );
  }

  const d = detail.data;
  const run = d.run;
  const yearName = (id: string | null) => years.data?.find((y) => y.academic_year_id === id)?.name ?? "—";
  const stage = STATUS_ORDER.indexOf(run.status);
  const homeroomNames = new Map((targetHomerooms.data ?? []).map((h) => [h.homeroom_id, h.name]));
  const showPlacement = run.status === "approved" || run.status === "executed";

  return (
    <div className="space-y-4 px-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-3 text-lg">
              Kenaikan Kelas {yearName(run.academic_year_id)}
              <Badge variant={statusBadgeVariant(run.status)}>{STATUS_LABEL[run.status]}</Badge>
            </CardTitle>
            <ol className="flex flex-wrap gap-2 text-xs" aria-label="Tahap">
              {STATUS_ORDER.map((s, i) => (
                <li key={s} className={i <= stage ? "font-semibold text-foreground" : "text-muted-foreground"}>
                  {i > 0 ? "→ " : ""}
                  {STATUS_LABEL[s]}
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">
              Dibuat {formatDateTime(run.created_at)}
              <Who id={run.created_by} userId={access.userId} />
              {run.approved_by ? (
                <>
                  {" · "}Disetujui
                  <Who id={run.approved_by} userId={access.userId} />
                </>
              ) : null}
              {run.executed_at ? (
                <>
                  {" · "}Dieksekusi {formatDateTime(run.executed_at)}
                  <Who id={run.executed_by} userId={access.userId} />
                </>
              ) : null}
            </p>
          </div>
          <ActionBar
            detail={d}
            access={access}
            onReevaluate={() => setReevaluating(true)}
            onExecute={() => setExecuting(true)}
            executeDisabled={unsavedPlacement}
          />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-6">
          <div>
            <p className="text-muted-foreground">Naik</p>
            <p className="text-lg font-semibold tabular-nums">{d.counts.promote}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tinggal</p>
            <p className="text-lg font-semibold tabular-nums">{d.counts.retain}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Lulus</p>
            <p className="text-lg font-semibold tabular-nums">{d.counts.graduate}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Override</p>
            <p className="text-lg font-semibold tabular-nums">{d.overridden}</p>
          </div>
          <div>
            <p className="text-muted-foreground">KKM</p>
            <p className="text-lg font-semibold tabular-nums">{formatScore(d.kkm)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Kriteria</p>
            <p>
              Rata-rata ≥ {d.criteria.min_average === null ? "—" : formatScore(d.criteria.min_average)}; mapel di bawah KKM ≤{" "}
              {d.criteria.max_subjects_below_kkm ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} variant="underline">
        <TabsList>
          <TabsTrigger value="decisions">Keputusan</TabsTrigger>
          {showPlacement ? <TabsTrigger value="placement">Penempatan</TabsTrigger> : null}
          <TabsTrigger value="cannot">Tidak bisa dievaluasi ({d.cannot_evaluate.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="decisions">
          {decisions.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <DecisionsTab
              runId={runId}
              decisions={decisions.data ?? []}
              editable={run.status === "draft" && access.canManage}
              homeroomNames={homeroomNames}
            />
          )}
        </TabsContent>
        {showPlacement ? (
          <TabsContent value="placement">
            <PlacementTab
              detail={d}
              decisions={decisions.data ?? []}
              editable={run.status === "approved" && access.canManage}
              onDirtyChange={setUnsavedPlacement}
            />
          </TabsContent>
        ) : null}
        <TabsContent value="cannot">
          <CannotEvaluateTab studentIds={d.cannot_evaluate} />
        </TabsContent>
      </Tabs>

      <CriteriaDialog
        open={reevaluating}
        onOpenChange={setReevaluating}
        mode="reevaluate"
        runId={runId}
        initial={d.criteria}
        overriddenCount={d.overridden}
      />
      <ExecuteDialog
        open={executing}
        onOpenChange={setExecuting}
        detail={d}
        decisions={decisions.data ?? []}
        targetYearName={run.target_academic_year_id ? yearName(run.target_academic_year_id) : ""}
      />
    </div>
  );
}
