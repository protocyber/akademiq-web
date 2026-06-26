"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Link2, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { hasAccessPerm, hasAccessRole } from "@/lib/auth/access-claims";
import { getErrorMessage } from "@/lib/errors/messages";
import { useLogout } from "@/lib/query/mutations/use-logout";
import {
  useCreateEvaluation,
  useDeleteEvaluation,
  useUpdateEvaluation,
  useUpsertGrade,
} from "@/lib/query/mutations/use-grading";
import { useSubjects } from "@/lib/query/queries/use-academic-config";
import { useHomerooms, useTeachers, useTeachingAssignments, type Teacher } from "@/lib/query/queries/use-academic-ops";
import { useClassGrades, useEvaluations, useGradingRoster, useReportTypes, useSubjectReportScoresForTypes, useUnmaterializedCount, type Evaluation, type Grade } from "@/lib/query/queries/use-grading";
import { useReportFormulasForTypes } from "@/lib/query/queries/use-grading";
import { useUpsertReportFormula } from "@/lib/query/mutations/use-grading";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";

import { WeightMatrixGrid } from "@/components/features/grading/weight-matrix-grid";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import { gradeCellSchema } from "@/lib/schemas/grading";
import {
  parseGradingEntryParams,
  serializeGradingEntryParams,
  type GradingEntryParams,
} from "@/lib/schemas/grading-entry-params";

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
      className="mx-auto w-full"
    >
      {!canWrite ? <Alert><AlertTitle>Kontrol dibatasi</AlertTitle><AlertDescription>{lockedMessage}</AlertDescription></Alert> : null}
      <GradeEntryPanel canWrite={canWrite} meUserId={me.data.user_id} />
    </SidebarLayout>
  );
}

function GradeEntryPanel({ canWrite, meUserId }: { canWrite: boolean; meUserId: string | undefined; }) {
  const { yearId, curriculumId, termId } = useAcademicScope();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = parseGradingEntryParams(searchParams);
  const homeroomId = params.homeroom_id ?? "";
  const subjectId = params.subject_id ?? "";
  const homerooms = useHomerooms();
  const [kelolOpen, setKelolOpen] = React.useState(false);

  const onParamsChange = React.useCallback(
    (nextParams: GradingEntryParams) => {
      const query = serializeGradingEntryParams(nextParams);
      router.replace(query ? `/grading/entry?${query}` : "/grading/entry", { scroll: false });
    },
    [router],
  );

  const previousYearId = React.useRef(yearId);

  React.useEffect(() => {
    const previous = previousYearId.current;
    previousYearId.current = yearId;
    if (!previous || !yearId || previous === yearId) return;
    if (homeroomId || subjectId) onParamsChange({});
  }, [yearId, homeroomId, subjectId, onParamsChange]);

  const subjects = useSubjects(curriculumId ?? undefined);
  const assignments = useTeachingAssignments(homeroomId);
  const teachers = useTeachers();
  const roster = useGradingRoster(homeroomId, yearId ?? undefined);
  const evaluations = useEvaluations(homeroomId, subjectId, yearId ?? undefined, termId ?? undefined);
  const grades = useClassGrades(homeroomId, subjectId, yearId ?? undefined);
  const reportTypes = useReportTypes(yearId ?? undefined, termId ?? undefined);
  const reportTypeIds = (reportTypes.data ?? []).map((t) => t.report_type_id);
  const reportScores = useSubjectReportScoresForTypes(reportTypeIds, homeroomId, subjectId);
  const unmaterializedCount = useUnmaterializedCount(termId ?? undefined);

  const filteredHomerooms = (homerooms.data ?? []).filter((room) => !yearId || room.academic_year_id === yearId);
  const assignedSubjectIds = new Set(
    (assignments.data ?? [])
      .filter((a) => a.academic_year_id === yearId)
      .map((a) => a.subject_id),
  );
  const assignedSubjects = (subjects.data ?? []).filter((s) => assignedSubjectIds.has(s.subject_id));
  const scopeReady = Boolean(yearId && homeroomId && subjectId);

  React.useEffect(() => {
    if (!homeroomId || !subjectId) return;
    if (assignments.isLoading || !assignments.data) return;

    const assignedIds = new Set(
      assignments.data
        .filter((a) => a.academic_year_id === yearId)
        .map((a) => a.subject_id),
    );

    if (!assignedIds.has(subjectId)) {
      onParamsChange({ homeroom_id: homeroomId });
    }
  }, [homeroomId, subjectId, assignments.data, assignments.isLoading, yearId, onParamsChange]);

  const teacherById = React.useMemo(
    () => new Map((teachers.data ?? []).map((t) => [t.teacher_id, t])),
    [teachers.data],
  );
  const assignedTeachers = React.useMemo(
    () =>
      (assignments.data ?? [])
        .filter((a) => a.subject_id === subjectId && a.academic_year_id === yearId)
        .map((a) => teacherById.get(a.teacher_id))
        .filter((t): t is Teacher => t !== undefined),
    [assignments.data, subjectId, yearId, teacherById],
  );
  const selectedHomeroom = filteredHomerooms.find((r) => r.homeroom_id === homeroomId);
  const walikelas = selectedHomeroom?.homeroom_teacher_id
    ? teacherById.get(selectedHomeroom.homeroom_teacher_id) ?? undefined
    : undefined;
  const isAssignedUser = assignedTeachers.some((t) => t.user_id === meUserId);
  const isTenantAdmin = hasAccessRole("tenant_admin");

  const canManageEvaluations = canWrite && scopeReady && assignedSubjects.length > 0 && (isTenantAdmin || isAssignedUser) && hasAccessPerm("grade.evaluation.manage");
  const canEditGrades = canWrite && assignedSubjects.length > 0 && isAssignedUser;

  // Build grade index: `studentId:evaluationId` → Grade
  const gradeIndex = React.useMemo(() => {
    const map = new Map<string, Grade>();
    for (const g of grades.data ?? []) {
      map.set(`${g.student_id}:${g.evaluation_id}`, g);
    }
    return map;
  }, [grades.data]);

  // Build live report-score index: `reportTypeId:studentId` → score
  const reportScoreIndex = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const [reportTypeId, rows] of reportScores.data ?? new Map()) {
      for (const row of rows) {
        map.set(`${reportTypeId}:${row.student_id}`, row.score);
      }
    }
    return map;
  }, [reportScores.data]);

  function changeHomeroom(id: string) {
    if (!id) {
      onParamsChange({});
    } else {
      onParamsChange({ homeroom_id: id, subject_id: subjectId || undefined });
    }
  }

  function changeSubject(id: string) {
    onParamsChange({ ...params, subject_id: id || undefined });
  }

  if (!yearId) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Silakan pilih tahun ajaran di header untuk memulai entri nilai.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Entri Nilai</CardTitle>
            <CardDescription className="mt-1">Pilih kelas dan mapel, lalu isi nilai per evaluasi. Tekan enter/tab, nilai otomatis tersimpan.</CardDescription>
          </div>
          {canManageEvaluations && (
            <Button size="sm" onClick={() => setKelolOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Kelola Evaluasi
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid gap-3 md:grid-cols-2 border-b p-4">
          <div>
            <Combobox
              items={filteredHomerooms}
              isLoading={homerooms.isLoading}
              value={homeroomId}
              onValueChange={changeHomeroom}
              getOptionValue={(r) => r.homeroom_id}
              getOptionLabel={(r) => r.name}
              placeholder="Pilih kelas"
              emptyText="Belum ada kelas"
              searchable
            />
            {homeroomId && (
              <div className="mt-1 space-y-1">
                {teachers.isLoading ? (
                  <Skeleton className="h-5 w-40" />
                ) : walikelas ? (
                  <TeacherBadge teacher={walikelas} label="Walikelas" />
                ) : (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Walikelas belum ditetapkan
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div>
            <Combobox
              items={assignedSubjects}
              isLoading={subjects.isLoading || assignments.isLoading}
              value={subjectId}
              onValueChange={changeSubject}
              getOptionValue={(s) => s.subject_id}
              getOptionLabel={(s) => s.name}
              placeholder="Pilih mapel"
              emptyText="Penugasan belum tersinkron"
              searchable
            />
            {subjectId && (
              <div className="mt-1 space-y-1">
                {teachers.isLoading || assignments.isLoading ? (
                  <Skeleton className="h-5 w-40" />
                ) : assignedTeachers.length > 0 ? (
                  assignedTeachers.map((teacher) => (
                    <TeacherBadge key={teacher.teacher_id} teacher={teacher} label="Guru" />
                  ))
                ) : (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Belum ada guru ditugaskan
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {homeroomId && subjectId && (
          <TeacherInfoBar
            assignedTeachers={assignedTeachers}
            isAssignedUser={isAssignedUser}
          />
        )}

        {scopeReady && unmaterializedCount.data && unmaterializedCount.data.count > 0 ? (
          <div className="border-b bg-amber-50 px-4 py-3 text-xs text-amber-900">
            {unmaterializedCount.data.count} penugasan pada semester aktif belum punya evaluasi. Minta admin menerapkan template evaluasi semester.
          </div>
        ) : null}

        {scopeReady && reportTypes.data && reportTypes.data.length === 0 ? (
          <div className="border-b bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Belum ada jenis rapor untuk semester ini. Nilai tetap bisa diisi, tetapi kolom rapor belum tersedia.
          </div>
        ) : null}

        {!scopeReady && (
          <p className="p-6 text-sm text-muted-foreground">
            Pilih kelas dan mapel untuk membuka grid nilai.
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
            reportTypes={reportTypes.data ?? []}
            reportScoreIndex={reportScoreIndex}
            homeroomId={homeroomId}
            subjectId={subjectId}
            yearId={yearId}
            canManageEvaluations={canManageEvaluations}
            canEditGrades={canEditGrades}
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
          termId={termId ?? undefined}
          evaluations={evaluations.data ?? []}
        />
      )}
    </Card>
  );
}

// ── Teacher Info Bar ───────────────────────────────────────────────────────────

function TeacherBadge({ teacher, label }: { teacher: Teacher; label: string; }) {
  const accountLabel = teacher.linked_user?.email ?? teacher.linked_user?.username ?? null;
  const isConnected = Boolean(teacher.user_id || teacher.linked_user);

  if (isConnected) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1.5 cursor-help hover:bg-secondary/80 transition-colors">
            {label}: <UserRound className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{teacher.full_name}</span>
            <Link2 className="h-3 w-3 text-green-600 dark:text-green-400" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Akun terhubung: {accountLabel ?? "Ya"}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1.5 opacity-80">
      {label}: <UserRound className="h-3 w-3 text-muted-foreground" />
      <span className="font-medium">{teacher.full_name}</span>
      <span className="text-secondary-foreground/60 font-normal">
        (akun belum terhubung)
      </span>
    </Badge>
  );
}

function TeacherInfoBar({
  assignedTeachers,
  isAssignedUser,
}: {
  assignedTeachers: Teacher[];
  isAssignedUser: boolean;
}) {
  if (!isAssignedUser && assignedTeachers.length > 0) {
    return (
      <div className="flex justify-center border-b px-4 py-2.5">
        <Badge variant="destructive">
          Anda bukan pengajar di kelas ini — nilai dinonaktifkan.
        </Badge>
      </div>
    );
  }
  return null;
}

// ── Grid ──────────────────────────────────────────────────────────────────────

type Student = { student_id: string; full_name: string | null; nis: string | null; };

function EvaluationGrid({
  students,
  evaluations,
  gradeIndex,
  reportTypes,
  reportScoreIndex,
  homeroomId,
  subjectId,
  yearId,
  canManageEvaluations,
  canEditGrades,
  onOpenKelola,
}: {
  students: Student[];
  evaluations: Evaluation[];
  gradeIndex: Map<string, Grade>;
  reportTypes: Array<{ report_type_id: string; code: string; }>;
  reportScoreIndex: Map<string, number>;
  homeroomId: string;
  subjectId: string;
  yearId: string;
  canManageEvaluations: boolean;
  canEditGrades: boolean;
  onOpenKelola: () => void;
}) {
  const gridRef = React.useRef<HTMLDivElement>(null);

  const sortedStudents = React.useMemo(() => {
    const name = (s: Student) => s.full_name ?? "";
    return [...students].sort((a, b) => name(a).localeCompare(name(b), "id", { sensitivity: "base" }));
  }, [students]);

  const focusAdjacent = React.useCallback((row: number, col: number, delta: number) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(
      `input[data-row="${row + delta}"][data-col="${col}"]`,
    );
    if (el) {
      el.focus();
      el.select();
    }
    return Boolean(el);
  }, []);

  // Committed-score averages per evaluation column (skip empty cells).
  const evalAverages = React.useMemo(() => {
    return evaluations.map((ev) => {
      let sum = 0;
      let count = 0;
      for (const student of sortedStudents) {
        const g = gradeIndex.get(`${student.student_id}:${ev.evaluation_id}`);
        if (g?.score != null) {
          sum += g.score;
          count += 1;
        }
      }
      return count > 0 ? sum / count : null;
    });
  }, [evaluations, sortedStudents, gradeIndex]);

  // Committed-score averages per report-type column (skip empty cells).
  const reportAverages = React.useMemo(() => {
    return reportTypes.map((rt) => {
      let sum = 0;
      let count = 0;
      for (const student of sortedStudents) {
        const score = reportScoreIndex.get(`${rt.report_type_id}:${student.student_id}`);
        if (score != null) {
          sum += score;
          count += 1;
        }
      }
      return count > 0 ? sum / count : null;
    });
  }, [reportTypes, sortedStudents, reportScoreIndex]);

  if (evaluations.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">Belum ada evaluasi untuk kelas+mapel ini.</p>
        {canManageEvaluations && (
          <Button size="sm" className="mt-3" onClick={onOpenKelola}>
            <Plus className="mr-1.5 h-4 w-4" />
            Tambah Evaluasi
          </Button>
        )}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Roster kelas sedang tersinkronisasi.</p>
        <p className="mt-1">Tunggu beberapa saat atau hubungi admin jika siswa belum muncul.</p>
      </div>
    );
  }

  return (
    <div ref={gridRef} className="overflow-x-auto rounded-b-md">
      <table className="w-full text-sm bg-card">
        <thead>
          <tr className="bg-muted/60">
            <th className="sticky left-0 z-10 bg-muted/60 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              No
            </th>
            <th className="sticky left-14 z-10 bg-muted/60 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Siswa
            </th>
            {evaluations.map((ev) => (
              <th key={ev.evaluation_id} className="min-w-[96px] px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ev.code}
              </th>
            ))}
            {reportTypes.map((rt) => (
              <th
                key={rt.report_type_id}
                className="min-w-[96px] border-l bg-muted/40 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                title={`Nilai Rapor — ${rt.code}`}
              >
                {rt.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedStudents.map((student, index) => (
            <tr key={student.student_id} className={cn("border-t", index % 2 === 0 ? "bg-muted/60 dark:bg-background/35" : "bg-background")}>
              <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 text-muted-foreground tabular-nums">
                {index + 1}
              </td>
              <td className="sticky left-14 z-10 bg-inherit px-4 py-2.5">
                <p className="font-medium">{student.full_name ?? "Nama belum tersinkronisasi"}</p>
                <p className="text-xs text-muted-foreground">{student.nis ?? "NIS belum tersinkronisasi"}</p>
              </td>
              {evaluations.map((ev, evalIndex) => (
                <td key={ev.evaluation_id} className="px-2 py-2 text-center">
                  <GradeCell
                    studentId={student.student_id}
                    evaluationId={ev.evaluation_id}
                    existingGrade={gradeIndex.get(`${student.student_id}:${ev.evaluation_id}`)}
                    homeroomId={homeroomId}
                    subjectId={subjectId}
                    yearId={yearId}
                    canWrite={canEditGrades}
                    rowIndex={index}
                    colIndex={evalIndex}
                    focusAdjacent={focusAdjacent}
                  />
                </td>
              ))}
              {reportTypes.map((rt) => {
                const score = reportScoreIndex.get(`${rt.report_type_id}:${student.student_id}`);
                return (
                  <td key={rt.report_type_id} className="border-l px-2 py-2 text-center text-sm tabular-nums text-muted-foreground">
                    {score == null ? <span className="text-xs">—</span> : score.toFixed(1)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/40">
            <td className="sticky left-0 z-10 bg-muted/60 px-4 py-2.5" />
            <td className="sticky left-14 z-10 bg-muted/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rata-Rata
            </td>
            {evalAverages.map((avg, i) => (
              <td key={evaluations[i]?.evaluation_id ?? i} className="px-3 py-2.5 text-center text-sm font-semibold tabular-nums">
                {avg == null ? <span className="text-xs text-muted-foreground">—</span> : avg.toFixed(1)}
              </td>
            ))}
            {reportAverages.map((avg, i) => (
              <td key={reportTypes[i]?.report_type_id ?? i} className="border-l px-3 py-2.5 text-center text-sm font-semibold tabular-nums">
                {avg == null ? <span className="text-xs text-muted-foreground">—</span> : avg.toFixed(1)}
              </td>
            ))}
          </tr>
        </tfoot>
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
  rowIndex,
  colIndex,
  focusAdjacent,
}: {
  studentId: string;
  evaluationId: string;
  existingGrade?: Grade;
  homeroomId: string;
  subjectId: string;
  yearId: string;
  canWrite: boolean;
  rowIndex: number;
  colIndex: number;
  focusAdjacent: (row: number, col: number, delta: number) => boolean;
}) {
  const [value, setValue] = React.useState(existingGrade?.score != null ? String(existingGrade.score) : "");
  const [savedValue, setSavedValue] = React.useState(value);
  const [status, setStatus] = React.useState<CellStatus>("idle");
  const [validationError, setValidationError] = React.useState("");
  const savedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const upsert = useUpsertGrade(homeroomId, subjectId, yearId);

  React.useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  React.useEffect(() => {
    const next = existingGrade?.score != null ? String(existingGrade.score) : "";
    setValue(next);
    setSavedValue(next);
    setValidationError("");
    if (!savedTimer.current) setStatus("idle");
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
      if (savedTimer.current) clearTimeout(savedTimer.current);
      setStatus("saved");
      savedTimer.current = setTimeout(() => {
        savedTimer.current = null;
        setStatus("idle");
      }, 800);
    } catch (err) {
      setStatus("error");
      toast.error(getErrorMessage(err, { fallback: "Gagal menyimpan nilai." }));
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
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          data-row={rowIndex}
          data-col={colIndex}
          onChange={(e) => {
            setValue(e.target.value);
            if (savedTimer.current) {
              clearTimeout(savedTimer.current);
              savedTimer.current = null;
            }
            setStatus("idle");
            setValidationError("");
          }}
          onBlur={() => void trySave()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!focusAdjacent(rowIndex, colIndex, 1)) void trySave();
              return;
            }
            if (e.key === "Tab") {
              if (focusAdjacent(rowIndex, colIndex, e.shiftKey ? -1 : 1)) e.preventDefault();
              return;
            }
            if (e.key === "ArrowUp") {
              if (focusAdjacent(rowIndex, colIndex, -1)) e.preventDefault();
              return;
            }
            if (e.key === "ArrowDown") {
              if (focusAdjacent(rowIndex, colIndex, 1)) e.preventDefault();
            }
          }}
          disabled={!canWrite || status === "saving"}
          placeholder="—"
          className={`w-20 px-2 py-1 text-center text-sm ${borderClass}`}
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void trySave()}
          className="h-auto p-0 text-[10px] text-amber-600 underline underline-offset-2 hover:bg-transparent hover:text-amber-700"
        >
          ⚠ Coba lagi
        </Button>
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
  termId,
  evaluations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeroomId: string;
  subjectId: string;
  yearId: string;
  termId?: string;
  evaluations: Evaluation[];
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Evaluation | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);

  const createMut = useCreateEvaluation(homeroomId, subjectId, yearId, termId ?? undefined);
  const updateMut = useUpdateEvaluation(homeroomId, subjectId, yearId, termId ?? undefined);
  const deleteMut = useDeleteEvaluation(homeroomId, subjectId, yearId, termId ?? undefined);

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
        ...(termId ? { term_id: termId } : {}),
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
      onOpenChange(false);
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
                    onDelete={(event) => {
                      event.currentTarget.blur();
                      setDeleteTarget(ev);
                    }}
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
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah Evaluasi
              </Button>
            </DialogFooter>
          )}

          {sorted.length > 0 && (
            <WeightMatrix yearId={yearId} termId={termId ?? undefined} homeroomId={homeroomId} subjectId={subjectId} evaluations={sorted} />
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
  onDelete: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
          <Button type="button" variant="ghost" size="sm" onClick={onMoveUp} disabled={isFirst} className="h-6 w-6 p-0">
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onMoveDown} disabled={isLast} className="h-6 w-6 p-0">
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
      <td className="py-2 pl-1">
        <div className="flex items-center gap-0.5">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="h-6 w-6 p-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Bobot per Jenis Rapor matrix ──────────────────────────────────────────────

export function WeightMatrix({
  yearId,
  termId,
  homeroomId,
  subjectId,
  evaluations,
}: {
  yearId: string;
  termId?: string;
  homeroomId: string;
  subjectId: string;
  evaluations: Evaluation[];
}) {
  const reportTypes = useReportTypes(yearId, termId);
  const reportTypeIds = (reportTypes.data ?? []).map((t) => t.report_type_id);
  const formulasByType = useReportFormulasForTypes(reportTypeIds);

  // weights[typeId][evaluationId] = number
  const [weights, setWeights] = React.useState<Record<string, Record<string, number>>>({});
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (hydrated || formulasByType.isLoading || !formulasByType.data) return;
    const next: Record<string, Record<string, number>> = {};
    const evalIds = new Set(evaluations.map((e) => e.evaluation_id));
    for (const [reportTypeId, rows] of formulasByType.data) {
      const map: Record<string, number> = {};
      for (const row of rows) {
        if (evalIds.has(row.evaluation_id)) map[row.evaluation_id] = row.weight;
      }
      next[reportTypeId] = map;
    }
    setWeights(next);
    setHydrated(true);
  }, [formulasByType.isLoading, formulasByType.data, evaluations, hydrated]);

  // Reset hydration when the subject/year/term changes.
  React.useEffect(() => {
    setHydrated(false);
  }, [subjectId, yearId, termId]);

  if (reportTypes.isLoading || !reportTypes.data) {
    return <Skeleton className="h-24 w-full" />;
  }
  const types = reportTypes.data;
  if (types.length === 0) {
    return (
      <p className="p-3 text-xs text-muted-foreground">
        Belum ada jenis rapor untuk semester ini. Tambahkan dari Pengaturan → Semester (tab Jenis Rapor pada semester yang dipilih).
      </p>
    );
  }

  function handleWeightChange(reportTypeId: string, evaluationId: string, raw: string) {
    setWeights((prev) => {
      const col = { ...(prev[reportTypeId] ?? {}) };
      if (raw === "") {
        delete col[evaluationId];
      } else {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) col[evaluationId] = parsed;
      }
      return { ...prev, [reportTypeId]: col };
    });
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <div>
        <p className="text-sm font-semibold">Bobot per Jenis Rapor</p>
        <p className="text-xs text-muted-foreground">
          Atur kontribusi tiap evaluasi ke tiap jenis rapor. Kolom harus berjumlah tepat 100% sebelum disimpan.
        </p>
      </div>
      <WeightMatrixGrid
        evaluations={evaluations}
        reportTypes={types}
        weights={weights}
        readOnly={false}
        onWeightChange={handleWeightChange}
      />
      <div className="flex flex-wrap gap-2">
        {types.map((rt) => (
          <WeightColumnSave key={rt.report_type_id} reportTypeId={rt.report_type_id} reportTypeCode={rt.code} homeroomId={homeroomId} subjectId={subjectId} weights={weights[rt.report_type_id] ?? {}} evaluations={evaluations} />
        ))}
      </div>
    </div>
  );
}

function WeightColumnSave({
  reportTypeId,
  reportTypeCode,
  homeroomId,
  subjectId,
  weights,
  evaluations,
}: {
  reportTypeId: string;
  reportTypeCode: string;
  homeroomId: string;
  subjectId: string;
  weights: Record<string, number>;
  evaluations: Evaluation[];
}) {
  const upsert = useUpsertReportFormula(reportTypeId, homeroomId);
  const total = Object.values(weights).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  const valid = evaluations.length > 0 && Math.abs(total - 100) < 1e-9;
  async function save() {
    if (!valid) return;
    try {
      await upsert.mutateAsync({ subjectId, weights });
      toast.success(`Bobot ${reportTypeCode} disimpan.`);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal menyimpan bobot." }));
    }
  }
  return (
    <Button size="sm" variant={valid ? "default" : "outline"} disabled={!valid || upsert.isPending} loading={upsert.isPending} onClick={() => void save()}>
      Simpan {reportTypeCode}
    </Button>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function EntrySkeleton() {
  return (
    <SidebarLayout>
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 w-full" />
      </main>
    </SidebarLayout>
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
