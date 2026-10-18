"use client";

import * as React from "react";

import { RESULT_LABEL } from "@/components/features/promotion/labels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage, promotionFieldGroups } from "@/lib/errors/messages";
import {
  EMPTY_DRAFT,
  applyClassDefault,
  draftChanges,
  effectiveTarget,
  eligibleHomerooms,
  groupBySourceHomeroom,
  mapAssignmentErrors,
  setStudentTarget,
  type PlacementDraft,
} from "@/lib/promotion/placement";
import { useAssignPromotionTargets, useSetPromotionTarget } from "@/lib/query/mutations/use-promotion";
import { useAcademicYears } from "@/lib/query/queries/use-academic-config";
import { useHomeroomsForYear, type Homeroom } from "@/lib/query/queries/use-academic-ops";
import type { PromotionDecision, PromotionRunDetail } from "@/lib/query/queries/use-promotion";

const NONE = "__none__";

function HomeroomSelect({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Homeroom[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
}) {
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)} disabled={disabled}>
      <SelectTrigger aria-label={label} className="w-full sm:w-48">
        <SelectValue placeholder="Pilih kelas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Belum dipilih</SelectItem>
        {options.map((h) => (
          <SelectItem key={h.homeroom_id} value={h.homeroom_id}>
            {h.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The value a class-default select shows: the shared target when every student of that result has the same one. */
function sharedTarget(decisions: PromotionDecision[], draft: PlacementDraft): string | null {
  const targets = new Set(decisions.map((d) => effectiveTarget(d, draft)));
  return targets.size === 1 ? [...targets][0] : null;
}

export function PlacementTab({
  detail,
  decisions,
  editable,
  onDirtyChange,
}: {
  detail: PromotionRunDetail;
  decisions: PromotionDecision[];
  editable: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const run = detail.run;
  const years = useAcademicYears();
  const homerooms = useHomeroomsForYear(run.target_academic_year_id ?? undefined);
  const setTarget = useSetPromotionTarget(run.run_id);
  const assign = useAssignPromotionTargets(run.run_id);

  const [yearChoice, setYearChoice] = React.useState<string>(run.target_academic_year_id ?? "");
  const [confirmYear, setConfirmYear] = React.useState(false);
  const [yearErrors, setYearErrors] = React.useState<string[]>([]);
  const [draft, setDraft] = React.useState<PlacementDraft>(EMPTY_DRAFT);
  const [rowErrors, setRowErrors] = React.useState<Record<string, string[]>>({});
  const [saveError, setSaveError] = React.useState<string[]>([]);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => setYearChoice(run.target_academic_year_id ?? ""), [run.target_academic_year_id]);

  const changes = React.useMemo(() => draftChanges(draft, decisions), [draft, decisions]);
  const dirty = changes.length > 0;
  React.useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const groups = React.useMemo(() => groupBySourceHomeroom(decisions), [decisions]);
  const rooms = homerooms.data ?? [];
  const targetYearId = run.target_academic_year_id;
  const yearOptions = (years.data ?? []).filter(
    (y) => y.academic_year_id !== run.academic_year_id && y.status !== "Closed" && y.status !== "Archived",
  );
  const assignedCount = decisions.filter((d) => d.target_homeroom_id !== null).length;

  async function saveYear() {
    setConfirmYear(false);
    setYearErrors([]);
    try {
      const outcome = await setTarget.mutateAsync(yearChoice);
      setDraft(EMPTY_DRAFT);
      toast.success(
        outcome.cleared_targets > 0
          ? `Tahun tujuan disimpan. ${outcome.cleared_targets} tujuan dikosongkan.`
          : "Tahun tujuan disimpan.",
      );
    } catch (error) {
      const groupsErr = promotionFieldGroups(error);
      if (groupsErr.length > 0) setYearErrors(groupsErr.flatMap((g) => g.messages));
      else toast.error(getErrorMessage(error, { fallback: "Tahun tujuan gagal disimpan." }));
    }
  }

  function requestYearSave() {
    if (yearChoice !== run.target_academic_year_id && assignedCount > 0) setConfirmYear(true);
    else void saveYear();
  }

  async function saveTargets() {
    setRowErrors({});
    setSaveError([]);
    try {
      const outcome = await assign.mutateAsync(changes);
      setDraft(EMPTY_DRAFT);
      toast.success(`${outcome.updated} tujuan disimpan.`);
    } catch (error) {
      const messages = promotionFieldGroups(error).flatMap((g) => g.messages);
      if (messages.length === 0) {
        setSaveError([getErrorMessage(error, { fallback: "Tujuan gagal disimpan." })]);
        return;
      }
      const mapped = mapAssignmentErrors(messages, new Set(decisions.map((d) => d.decision_id)));
      setRowErrors(mapped.byDecision);
      setSaveError(mapped.unmatched);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Tahun tujuan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={yearChoice} onValueChange={setYearChoice} disabled={!editable}>
              <SelectTrigger aria-label="Tahun tujuan" className="sm:w-56">
                <SelectValue placeholder="Pilih tahun tujuan" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y.academic_year_id} value={y.academic_year_id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={requestYearSave}
              disabled={!editable || yearChoice === "" || yearChoice === run.target_academic_year_id}
              loading={setTarget.isPending}
            >
              Simpan tahun tujuan
            </Button>
          </div>
          {yearErrors.length > 0 ? (
            <ul className="list-disc pl-4 text-sm text-destructive">
              {yearErrors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {targetYearId ? (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">2. Kelas tujuan</CardTitle>
            {dirty ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{changes.length} perubahan belum disimpan</Badge>
                <Button variant="outline" onClick={() => setDraft(EMPTY_DRAFT)} disabled={assign.isPending}>
                  Batalkan
                </Button>
                <Button onClick={saveTargets} loading={assign.isPending}>
                  Simpan
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {saveError.length > 0 ? (
              <Alert variant="destructive">
                <AlertTitle>Penempatan ditolak</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {saveError.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
            {groups.map((group) => {
              const promote = group.decisions.filter((d) => d.result === "promote");
              const retain = group.decisions.filter((d) => d.result === "retain");
              const isOpen = expanded.has(group.homeroom_id);
              return (
                <div key={group.homeroom_id} className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="font-medium">
                      {group.homeroom_name}{" "}
                      <span className="text-sm text-muted-foreground">({group.decisions.length} siswa)</span>
                    </p>
                    {group.source_ordinal === null ? (
                      <p className="text-sm text-destructive">
                        Kelas ini belum tertaut ke tingkat kelas, jadi tujuannya tidak bisa ditentukan.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {promote.length > 0 ? (
                          <HomeroomSelect
                            label={`Naik ke untuk ${group.homeroom_name}`}
                            options={eligibleHomerooms(promote[0], rooms, targetYearId)}
                            value={sharedTarget(promote, draft)}
                            onChange={(v) => {
                              if (v) setDraft((prev) => applyClassDefault(prev, decisions, group.homeroom_id, "promote", v));
                            }}
                            disabled={!editable}
                          />
                        ) : null}
                        {retain.length > 0 ? (
                          <HomeroomSelect
                            label={`Tinggal di untuk ${group.homeroom_name}`}
                            options={eligibleHomerooms(retain[0], rooms, targetYearId)}
                            value={sharedTarget(retain, draft)}
                            onChange={(v) => {
                              if (v) setDraft((prev) => applyClassDefault(prev, decisions, group.homeroom_id, "retain", v));
                            }}
                            disabled={!editable}
                          />
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(group.homeroom_id)) next.delete(group.homeroom_id);
                              else next.add(group.homeroom_id);
                              return next;
                            })
                          }
                        >
                          {isOpen ? "Sembunyikan siswa" : "Lihat siswa"}
                        </Button>
                      </div>
                    )}
                  </div>
                  {isOpen || group.decisions.some((d) => rowErrors[d.decision_id]) ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Hasil</TableHead>
                          <TableHead>Kelas tujuan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.decisions.map((d) => (
                          <TableRow key={d.decision_id}>
                            <TableCell>{d.full_name ?? "—"}</TableCell>
                            <TableCell>{RESULT_LABEL[d.result]}</TableCell>
                            <TableCell className="space-y-1">
                              {d.result === "graduate" ? (
                                <span className="text-sm text-muted-foreground">Lulus — tanpa kelas tujuan</span>
                              ) : (
                                <HomeroomSelect
                                  label={`Kelas tujuan ${d.full_name ?? d.nis ?? ""}`}
                                  options={eligibleHomerooms(d, rooms, targetYearId)}
                                  value={effectiveTarget(d, draft)}
                                  onChange={(v) => setDraft((prev) => setStudentTarget(prev, d.decision_id, v))}
                                  disabled={!editable}
                                />
                              )}
                              {(rowErrors[d.decision_id] ?? []).map((m) => (
                                <p key={m} className="text-xs text-destructive">
                                  {m}
                                </p>
                              ))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Laporan penempatan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">{detail.unassigned} siswa belum punya tujuan</p>
          {detail.placement.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kelas tujuan yang dipakai.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-right">Kapasitas</TableHead>
                  <TableHead className="text-right">Sudah ada</TableHead>
                  <TableHead className="text-right">Ditempatkan</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.placement.map((p) => (
                  <TableRow key={p.homeroom_id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.capacity}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.existing_active}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.assigned}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.total}</TableCell>
                    <TableCell>
                      {p.over_capacity ? (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                          Melebihi kapasitas
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground">Angka ini dari data tersimpan; simpan perubahan untuk memperbaruinya.</p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmYear}
        onOpenChange={setConfirmYear}
        title="Ganti tahun tujuan?"
        description={`${assignedCount} tujuan yang sudah diisi akan dikosongkan.`}
        confirmLabel="Ganti"
        destructive
        loading={setTarget.isPending}
        onConfirm={saveYear}
      />
    </div>
  );
}
