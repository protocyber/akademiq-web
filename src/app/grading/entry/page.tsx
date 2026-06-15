"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuerySelect } from "@/components/ui/query-select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { useLogout } from "@/lib/query/mutations/use-logout";
import {
  useCreateEvaluation,
  useDeleteEvaluation,
  useUpdateEvaluation,
  useUpsertGrade,
} from "@/lib/query/mutations/use-grading";
import { useAcademicYears, useCurriculumVersions, useSubjects } from "@/lib/query/queries/use-academic-config";
import { useHomeroomRoster, useHomerooms, useTeachingAssignments } from "@/lib/query/queries/use-academic-ops";
import { useClassGrades, useEvaluations, type Evaluation, type Grade } from "@/lib/query/queries/use-grading";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { gradeCellSchema } from "@/lib/schemas/grading";

export default function GradeEntryPage() {
  return <AuthGuard fallback={<EntrySkeleton />}><GradeEntryShell /></AuthGuard>;
}

function GradeEntryShell() {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  if (tenant.isLoading || me.isLoading) return <EntrySkeleton />;
  if (tenant.error || me.error || !tenant.data || !me.data) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Alert variant="destructive"><AlertTitle>Tidak bisa memuat entri nilai</AlertTitle><AlertDescription>Coba muat ulang halaman.</AlertDescription></Alert>
      </main>
    );
  }
  const gradingModule = tenant.data.modules.find((item) => item.feature_code === "grading");
  const canWrite = Boolean(gradingModule?.plan_entitled && gradingModule.enabled);
  const lockedMessage = gradingModule?.plan_entitled
    ? "Aktifkan modul grading terlebih dahulu."
    : "Upgrade plan untuk menggunakan entri nilai.";
  return (
    <SidebarLayout
      schoolName={tenant.data.school_name}
      userName={me.data.full_name}
      userEmail={me.data.email}
      isLoggingOut={logout.isPending}
      onLogout={async () => { await logout.mutateAsync(); router.push("/login"); }}
      className="mx-auto max-w-7xl"
    >
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Entri Nilai</h1>
        <p className="text-sm text-muted-foreground">Pilih kelas dan mapel, lalu isi nilai per evaluasi. Setiap sel menyimpan otomatis saat pindah fokus.</p>
      </div>
      {!canWrite ? <Alert><AlertTitle>Kontrol dibatasi</AlertTitle><AlertDescription>{lockedMessage}</AlertDescription></Alert> : null}
      <GradeEntryPanel canWrite={canWrite} />
    </SidebarLayout>
  );
}

function GradeEntryPanel({ canWrite }: { canWrite: boolean }) {
  const years = useAcademicYears();
  const homerooms = useHomerooms();
  const [yearId, setYearId] = React.useState("");
  const [homeroomId, setHomeroomId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [kelolOpen, setKelolOpen] = React.useState(false);

  const curriculum = useCurriculumVersions(yearId);
  const curriculumId = curriculum.data?.[0]?.curriculum_version_id;
  const subjects = useSubjects(curriculumId);
  const assignments = useTeachingAssignments(homeroomId);
  const roster = useHomeroomRoster(homeroomId);
  const evaluations = useEvaluations(homeroomId, subjectId, yearId);
  const grades = useClassGrades(homeroomId, subjectId, yearId);

  const activeYears = (years.data ?? []).filter((year) => year.status === "Active");
  const filteredHomerooms = (homerooms.data ?? []).filter((room) => !yearId || room.academic_year_id === yearId);
  const assignedSubjectIds = new Set(
    (assignments.data ?? [])
      .filter((a) => a.academic_year_id === yearId)
      .map((a) => a.subject_id),
  );
  const assignedSubjects = (subjects.data ?? []).filter((s) => assignedSubjectIds.has(s.subject_id));
  const scopeReady = Boolean(yearId && homeroomId && subjectId);
  const canManageEvaluations = canWrite && scopeReady && assignedSubjects.length > 0;

  // Build grade index: `studentId:evaluationId` → Grade
  const gradeIndex = React.useMemo(() => {
    const map = new Map<string, Grade>();
    for (const g of grades.data ?? []) {
      map.set(`${g.student_id}:${g.evaluation_id}`, g);
    }
    return map;
  }, [grades.data]);

  function changeYear(id: string) { setYearId(id); setHomeroomId(""); setSubjectId(""); }
  function changeHomeroom(id: string) { setHomeroomId(id); setSubjectId(""); }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Grid Nilai Kelas</CardTitle>
            <CardDescription className="mt-1">Nilai per evaluasi. Sel menyimpan otomatis saat kehilangan fokus.</CardDescription>
          </div>
          {canManageEvaluations && (
            <Button variant="outline" size="sm" onClick={() => setKelolOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Kelola Evaluasi
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <QuerySelect
            items={activeYears}
            isLoading={years.isLoading}
            value={yearId}
            onValueChange={changeYear}
            getValue={(y) => y.academic_year_id}
            getLabel={(y) => y.name}
            placeholder="Pilih tahun aktif"
            emptyText="Belum ada tahun aktif"
          />
          <QuerySelect
            items={filteredHomerooms}
            isLoading={homerooms.isLoading}
            value={homeroomId}
            onValueChange={changeHomeroom}
            getValue={(r) => r.homeroom_id}
            getLabel={(r) => r.name}
            placeholder="Pilih kelas"
            emptyText="Belum ada kelas"
          />
          <QuerySelect
            items={assignedSubjects}
            isLoading={subjects.isLoading || assignments.isLoading}
            value={subjectId}
            onValueChange={setSubjectId}
            getValue={(s) => s.subject_id}
            getLabel={(s) => s.name}
            placeholder="Pilih mapel"
            emptyText="Penugasan belum tersinkron"
          />
        </div>

        {!scopeReady && (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Pilih tahun, kelas, dan mapel untuk membuka grid nilai.
          </p>
        )}

        {scopeReady && (roster.isLoading || evaluations.isLoading || grades.isLoading) && (
          <EntryGridSkeleton />
        )}

        {scopeReady && !roster.isLoading && !evaluations.isLoading && !grades.isLoading && (
          <EvaluationGrid
            students={roster.data ?? []}
            evaluations={evaluations.data ?? []}
            gradeIndex={gradeIndex}
            homeroomId={homeroomId}
            subjectId={subjectId}
            yearId={yearId}
            canWrite={canWrite && assignedSubjects.length > 0}
            onOpenKelola={() => setKelolOpen(true)}
          />
        )}
      </CardContent>

      {kelolOpen && (
        <KelolEvaluasiModal
          open={kelolOpen}
          onOpenChange={setKelolOpen}
          homeroomId={homeroomId}
          subjectId={subjectId}
          yearId={yearId}
          evaluations={evaluations.data ?? []}
        />
      )}
    </Card>
  );
}

// ── Grid ──────────────────────────────────────────────────────────────────────

type Student = { student_id: string; full_name: string; nis: string };

function EvaluationGrid({
  students,
  evaluations,
  gradeIndex,
  homeroomId,
  subjectId,
  yearId,
  canWrite,
  onOpenKelola,
}: {
  students: Student[];
  evaluations: Evaluation[];
  gradeIndex: Map<string, Grade>;
  homeroomId: string;
  subjectId: string;
  yearId: string;
  canWrite: boolean;
  onOpenKelola: () => void;
}) {
  if (evaluations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">Belum ada evaluasi untuk kelas+mapel ini.</p>
        {canWrite && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onOpenKelola}>
            <Plus className="mr-1.5 h-4 w-4" />
            Tambah Evaluasi
          </Button>
        )}
      </div>
    );
  }

  if (students.length === 0) {
    return <p className="rounded-lg border p-4 text-sm text-muted-foreground">Roster kelas kosong.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60">
            <th className="sticky left-0 z-10 bg-muted/60 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Siswa
            </th>
            {evaluations.map((ev) => (
              <th key={ev.evaluation_id} className="min-w-[96px] px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ev.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.student_id} className="border-t">
              <td className="sticky left-0 z-10 bg-background px-4 py-2.5">
                <p className="font-medium">{student.full_name}</p>
                <p className="text-xs text-muted-foreground">{student.nis}</p>
              </td>
              {evaluations.map((ev) => (
                <td key={ev.evaluation_id} className="px-2 py-2 text-center">
                  <GradeCell
                    studentId={student.student_id}
                    evaluationId={ev.evaluation_id}
                    existingGrade={gradeIndex.get(`${student.student_id}:${ev.evaluation_id}`)}
                    homeroomId={homeroomId}
                    subjectId={subjectId}
                    yearId={yearId}
                    canWrite={canWrite}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Per-cell auto-save ────────────────────────────────────────────────────────

type CellStatus = "idle" | "saving" | "saved" | "error";

function GradeCell({
  studentId,
  evaluationId,
  existingGrade,
  homeroomId,
  subjectId,
  yearId,
  canWrite,
}: {
  studentId: string;
  evaluationId: string;
  existingGrade?: Grade;
  homeroomId: string;
  subjectId: string;
  yearId: string;
  canWrite: boolean;
}) {
  const [value, setValue] = React.useState(existingGrade?.score != null ? String(existingGrade.score) : "");
  const [savedValue, setSavedValue] = React.useState(value);
  const [status, setStatus] = React.useState<CellStatus>("idle");
  const [validationError, setValidationError] = React.useState("");
  const upsert = useUpsertGrade(homeroomId, subjectId, yearId);

  React.useEffect(() => {
    const next = existingGrade?.score != null ? String(existingGrade.score) : "";
    setValue(next);
    setSavedValue(next);
    setStatus("idle");
    setValidationError("");
  }, [existingGrade?.score, existingGrade?.grade_id]);

  async function trySave() {
    if (value === savedValue) return;
    const parsed = gradeCellSchema.safeParse(value);
    if (!parsed.success) {
      setValidationError(parsed.error.errors[0]?.message ?? "Nilai tidak valid");
      return;
    }
    setValidationError("");
    setStatus("saving");
    try {
      await upsert.mutateAsync({ student_id: studentId, evaluation_id: evaluationId, score: parsed.data });
      setSavedValue(value);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const isInvalid = validationError !== "";
  const borderClass = isInvalid
    ? "border-destructive focus:ring-destructive/30"
    : status === "error"
      ? "border-amber-500 focus:ring-amber-500/30"
      : "border-input focus:ring-ring/30";

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setStatus("idle");
            setValidationError("");
          }}
          onBlur={() => void trySave()}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            void trySave();
          }}
          disabled={!canWrite || status === "saving"}
          placeholder="—"
          className={`w-20 rounded-md border px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${borderClass}`}
        />
        {status === "saving" && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
        )}
        {status === "saved" && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-green-600">✓</span>
        )}
      </div>
      {isInvalid && <p className="text-[10px] text-destructive">{validationError}</p>}
      {status === "error" && !isInvalid && (
        <button
          type="button"
          onClick={() => void trySave()}
          className="text-[10px] text-amber-600 underline underline-offset-2"
        >
          ⚠ Coba lagi
        </button>
      )}
    </div>
  );
}

// ── Kelola Evaluasi modal ─────────────────────────────────────────────────────

function KelolEvaluasiModal({
  open,
  onOpenChange,
  homeroomId,
  subjectId,
  yearId,
  evaluations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeroomId: string;
  subjectId: string;
  yearId: string;
  evaluations: Evaluation[];
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Evaluation | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);

  const createMut = useCreateEvaluation(homeroomId, subjectId, yearId);
  const updateMut = useUpdateEvaluation(homeroomId, subjectId, yearId);
  const deleteMut = useDeleteEvaluation(homeroomId, subjectId, yearId);

  // ── Add form state ──────────────────────────────────────────────────────────
  const [newCode, setNewCode] = React.useState("");
  const [newName, setNewName] = React.useState("");

  async function handleAdd() {
    if (!newCode.trim() || !newName.trim()) return;
    const nextPosition = evaluations.length > 0 ? Math.max(...evaluations.map((e) => e.position)) + 1 : 1;
    try {
      await createMut.mutateAsync({
        homeroom_id: homeroomId,
        subject_id: subjectId,
        academic_year_id: yearId,
        code: newCode.trim(),
        name: newName.trim(),
        position: nextPosition,
      });
      setNewCode("");
      setNewName("");
      setShowAddForm(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal menambah evaluasi." }));
    }
  }

  async function handleReorder(ev: Evaluation, direction: "up" | "down") {
    const sorted = [...evaluations].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((e) => e.evaluation_id === ev.evaluation_id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swapTarget = sorted[swapIdx];
    try {
      await Promise.all([
        updateMut.mutateAsync({ evaluationId: ev.evaluation_id, position: swapTarget.position }),
        updateMut.mutateAsync({ evaluationId: swapTarget.evaluation_id, position: ev.position }),
      ]);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal mengubah urutan." }));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.evaluation_id);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal menghapus evaluasi." }));
    }
  }

  const sorted = [...evaluations].sort((a, b) => a.position - b.position);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kelola Evaluasi</DialogTitle>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Belum ada evaluasi. Tambah di bawah.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium text-muted-foreground">Kode</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Nama</th>
                    <th className="pb-2 text-center font-medium text-muted-foreground">Urutan</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((ev, idx) => (
                    <EvaluationRow
                      key={ev.evaluation_id}
                      evaluation={ev}
                      isFirst={idx === 0}
                      isLast={idx === sorted.length - 1}
                      isEditing={editingId === ev.evaluation_id}
                      onEdit={() => setEditingId(ev.evaluation_id)}
                      onEditDone={() => setEditingId(null)}
                      onDelete={() => setDeleteTarget(ev)}
                      onMoveUp={() => void handleReorder(ev, "up")}
                      onMoveDown={() => void handleReorder(ev, "down")}
                      updateMut={updateMut}
                      homeroomId={homeroomId}
                      subjectId={subjectId}
                      yearId={yearId}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {showAddForm ? (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Tambah evaluasi baru</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Kode</Label>
                  <Input
                    placeholder="UH1"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nama</Label>
                  <Input
                    placeholder="Ulangan Harian 1"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" loading={createMut.isPending} onClick={() => void handleAdd()} disabled={!newCode.trim() || !newName.trim()}>
                  Simpan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewCode(""); setNewName(""); }}>
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah Evaluasi
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Hapus Evaluasi"
        description={`Hapus evaluasi "${deleteTarget?.name ?? ""}"? Semua nilai yang terkait juga akan dihapus dan tidak dapat dikembalikan.`}
        confirmLabel="Hapus"
        loadingLabel="Menghapus..."
        loading={deleteMut.isPending}
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}

function EvaluationRow({
  evaluation,
  isFirst,
  isLast,
  isEditing,
  onEdit,
  onEditDone,
  onDelete,
  onMoveUp,
  onMoveDown,
  updateMut,
}: {
  evaluation: Evaluation;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onEditDone: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  updateMut: ReturnType<typeof useUpdateEvaluation>;
  homeroomId: string;
  subjectId: string;
  yearId: string;
}) {
  const [editCode, setEditCode] = React.useState(evaluation.code);
  const [editName, setEditName] = React.useState(evaluation.name);

  React.useEffect(() => {
    if (isEditing) {
      setEditCode(evaluation.code);
      setEditName(evaluation.name);
    }
  }, [isEditing, evaluation.code, evaluation.name]);

  async function saveEdit() {
    try {
      await updateMut.mutateAsync({
        evaluationId: evaluation.evaluation_id,
        code: editCode.trim() || undefined,
        name: editName.trim() || undefined,
      });
      onEditDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal menyimpan perubahan." }));
    }
  }

  if (isEditing) {
    return (
      <tr className="border-t">
        <td className="py-1.5 pr-1">
          <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="h-7 text-xs" />
        </td>
        <td className="py-1.5 pr-1">
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" />
        </td>
        <td />
        <td className="py-1.5 pl-1">
          <div className="flex gap-1">
            <Button size="sm" className="h-7 px-2 text-xs" loading={updateMut.isPending} onClick={() => void saveEdit()}>
              OK
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onEditDone}>
              Batal
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t">
      <td className="py-2 pr-2 font-medium">{evaluation.code}</td>
      <td className="py-2 pr-2 text-muted-foreground">{evaluation.name}</td>
      <td className="py-2 text-center">
        <div className="flex items-center justify-center gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={isFirst} className="rounded p-0.5 hover:bg-muted disabled:opacity-30">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={isLast} className="rounded p-0.5 hover:bg-muted disabled:opacity-30">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
      <td className="py-2 pl-1">
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onEdit} className="rounded p-1 hover:bg-muted">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onDelete} className="rounded p-1 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function EntrySkeleton() {
  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-40 w-full" />
    </main>
  );
}

function EntryGridSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
