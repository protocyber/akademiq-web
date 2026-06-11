"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QuerySelect } from "@/components/ui/query-select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useRecordGrade, useUpdateGrade } from "@/lib/query/mutations/use-grading";
import { useAcademicYears, useCurriculumVersions, useSubjects } from "@/lib/query/queries/use-academic-config";
import { useHomeroomRoster, useHomerooms, useTeachingAssignments } from "@/lib/query/queries/use-academic-ops";
import { useClassGrades, type Grade } from "@/lib/query/queries/use-grading";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { gradeEntrySchema } from "@/lib/schemas/grading";

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
    return <main className="container mx-auto max-w-4xl px-4 py-10"><Alert variant="destructive"><AlertTitle>Tidak bisa memuat entri nilai</AlertTitle><AlertDescription>Coba muat ulang halaman.</AlertDescription></Alert></main>;
  }
  const gradingModule = tenant.data.modules.find((item) => item.feature_code === "grading");
  const canWrite = Boolean(gradingModule?.plan_entitled && gradingModule.enabled);
  const lockedMessage = gradingModule?.plan_entitled ? "Aktifkan modul grading terlebih dahulu." : "Upgrade plan untuk menggunakan entri nilai.";
  return (
    <SidebarLayout schoolName={tenant.data.school_name} userName={me.data.full_name} userEmail={me.data.email} isLoggingOut={logout.isPending} onLogout={async () => { await logout.mutateAsync(); router.push("/login"); }} className="mx-auto max-w-6xl">
      <div className="space-y-2"><h1 className="font-display text-3xl font-extrabold tracking-tight">Entri Nilai</h1><p className="text-sm text-muted-foreground">Pilih kelas dan subject yang sudah disinkronkan dari penugasan mengajar, lalu simpan nilai per siswa.</p></div>
      {!canWrite ? <Alert><AlertTitle>Kontrol dibatasi</AlertTitle><AlertDescription>{lockedMessage}</AlertDescription></Alert> : null}
      <GradeEntryPanel canWrite={canWrite} lockedMessage={lockedMessage} />
    </SidebarLayout>
  );
}

function GradeEntryPanel({ canWrite, lockedMessage }: { canWrite: boolean; lockedMessage: string }) {
  const years = useAcademicYears();
  const homerooms = useHomerooms();
  const [yearId, setYearId] = React.useState("");
  const [homeroomId, setHomeroomId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const curriculum = useCurriculumVersions(yearId);
  const curriculumId = curriculum.data?.[0]?.curriculum_version_id;
  const subjects = useSubjects(curriculumId);
  const assignments = useTeachingAssignments(homeroomId);
  const roster = useHomeroomRoster(homeroomId);
  const grades = useClassGrades(homeroomId, subjectId, yearId);
  const activeYears = (years.data ?? []).filter((year) => year.status === "Active");
  const filteredHomerooms = (homerooms.data ?? []).filter((room) => !yearId || room.academic_year_id === yearId);
  const assignedSubjectIds = new Set((assignments.data ?? []).filter((assignment) => assignment.academic_year_id === yearId).map((assignment) => assignment.subject_id));
  const assignedSubjects = (subjects.data ?? []).filter((subject) => assignedSubjectIds.has(subject.subject_id));
  const gradeByStudent = new Map((grades.data ?? []).map((grade) => [grade.student_id, grade]));
  const selectedReady = Boolean(yearId && homeroomId && subjectId);
  const syncingAssignments = Boolean(homeroomId && !assignments.isLoading && assignedSubjects.length === 0);

  function changeYear(id: string) { setYearId(id); setHomeroomId(""); setSubjectId(""); }
  function changeHomeroom(id: string) { setHomeroomId(id); setSubjectId(""); }

  return (
    <Card>
      <CardHeader><CardTitle>Grid Nilai Kelas</CardTitle><CardDescription>Simpan inline per siswa. Nilai valid antara 0-100.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <QuerySelect items={activeYears} isLoading={years.isLoading} value={yearId} onValueChange={changeYear} getValue={(year) => year.academic_year_id} getLabel={(year) => year.name} placeholder="Pilih tahun aktif" emptyText="Belum ada tahun aktif" />
          <QuerySelect items={filteredHomerooms} isLoading={homerooms.isLoading} value={homeroomId} onValueChange={changeHomeroom} getValue={(room) => room.homeroom_id} getLabel={(room) => room.name} placeholder="Pilih kelas" emptyText="Belum ada kelas" />
          <QuerySelect items={assignedSubjects} isLoading={subjects.isLoading || assignments.isLoading} value={subjectId} onValueChange={setSubjectId} getValue={(subject) => subject.subject_id} getLabel={(subject) => subject.name} placeholder="Pilih subject" emptyText="Penugasan belum tersinkron" />
        </div>
        {syncingAssignments ? <Alert><AlertTitle>Penugasan belum tersinkron</AlertTitle><AlertDescription>Belum ada subject yang bisa dipilih untuk kelas ini. Tunggu event penugasan masuk atau minta admin mengecek assignment.</AlertDescription></Alert> : null}
        {!selectedReady ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Pilih tahun, kelas, dan subject untuk membuka grid nilai.</p> : null}
        {selectedReady && (roster.isLoading || grades.isLoading) ? <EntryGridSkeleton /> : null}
        {selectedReady && !roster.isLoading && !grades.isLoading ? <GradeGrid students={roster.data ?? []} gradeByStudent={gradeByStudent} yearId={yearId} subjectId={subjectId} homeroomId={homeroomId} canWrite={canWrite && assignedSubjects.length > 0} lockedMessage={assignedSubjects.length > 0 ? lockedMessage : "Penugasan belum tersinkron."} /> : null}
      </CardContent>
    </Card>
  );
}

function GradeGrid({ students, gradeByStudent, yearId, subjectId, homeroomId, canWrite, lockedMessage }: { students: Array<{ student_id: string; full_name: string; nis: string }>; gradeByStudent: Map<string, Grade>; yearId: string; subjectId: string; homeroomId: string; canWrite: boolean; lockedMessage: string }) {
  if (students.length === 0) return <p className="rounded-lg border p-4 text-sm text-muted-foreground">Roster kelas kosong.</p>;
  return <div className="overflow-hidden rounded-lg border"><div className="grid grid-cols-[1fr_140px_110px] bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span>Siswa</span><span>Nilai</span><span>Aksi</span></div>{students.map((student) => <GradeRow key={student.student_id} student={student} grade={gradeByStudent.get(student.student_id)} yearId={yearId} subjectId={subjectId} homeroomId={homeroomId} canWrite={canWrite} lockedMessage={lockedMessage} />)}</div>;
}

function GradeRow({ student, grade, yearId, subjectId, homeroomId, canWrite, lockedMessage }: { student: { student_id: string; full_name: string; nis: string }; grade?: Grade; yearId: string; subjectId: string; homeroomId: string; canWrite: boolean; lockedMessage: string }) {
  const [score, setScore] = React.useState(String(grade?.score ?? ""));
  const record = useRecordGrade(homeroomId);
  const update = useUpdateGrade(homeroomId, subjectId, yearId);
  React.useEffect(() => { setScore(String(grade?.score ?? "")); }, [grade?.score]);
  async function save() {
    const parsed = gradeEntrySchema.safeParse({ student_id: student.student_id, subject_id: subjectId, academic_year_id: yearId, score });
    if (!parsed.success) { toast.error(parsed.error.flatten().fieldErrors.score?.[0] ?? "Nilai tidak valid."); return; }
    try {
      if (grade) await update.mutateAsync({ gradeId: grade.grade_id, score: parsed.data.score });
      else await record.mutateAsync(parsed.data);
      toast.success(`Nilai ${student.full_name} disimpan.`);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Nilai gagal disimpan." }));
    }
  }
  const saving = record.isPending || update.isPending;
  return <div className="grid grid-cols-[1fr_140px_110px] items-center gap-3 border-t px-4 py-3 text-sm"><div><p className="font-medium">{student.full_name}</p><p className="text-xs text-muted-foreground">{student.nis}</p></div><Input inputMode="decimal" value={score} onChange={(event) => setScore(event.target.value)} disabled={!canWrite || saving} placeholder="0-100" /><Button size="sm" loading={saving} disabled={!canWrite} onClick={save}>{grade ? "Update" : "Simpan"}</Button>{!canWrite ? <p className="col-span-3 text-xs text-muted-foreground">{lockedMessage}</p> : null}</div>;
}

function EntrySkeleton() { return <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10"><Skeleton className="h-9 w-56" /><Skeleton className="h-40 w-full" /></main>; }
function EntryGridSkeleton() { return <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>; }
