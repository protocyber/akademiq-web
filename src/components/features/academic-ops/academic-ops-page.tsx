"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { QuerySelect } from "@/components/ui/query-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { ApiHttpError } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors/messages";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useAcademicYears, useSubjects, useCurriculumVersions } from "@/lib/query/queries/use-academic-config";
import { useAssignTeaching, useCreateHomeroom, useCreateStudent, useCreateTeacher, useEnrollStudent, useImportStudents, useImportTeachers, useLinkTeacherAccount, useUpdateStudent } from "@/lib/query/mutations/use-academic-ops";
import { useHomeroomRoster, useHomerooms, useStudents, useTeachers, useTeachingAssignments, type Student } from "@/lib/query/queries/use-academic-ops";
import { useTenantUsers } from "@/lib/query/queries/use-tenant-users";
import { enrollmentSchema, homeroomSchema, studentSchema, teacherSchema, teachingAssignmentSchema, type EnrollmentForm, type HomeroomForm, type StudentForm, type TeacherForm, type TeachingAssignmentForm } from "@/lib/schemas/academic-ops";

const opsNav = [
  { href: "/students", label: "Siswa" },
  { href: "/teachers", label: "Guru" },
  { href: "/homerooms", label: "Kelas" },
  { href: "/teaching-assignments", label: "Penugasan" },
  { href: "/import", label: "Import" },
];

type Context = { canManage: boolean; upgradeMessage: string };

export function AcademicOpsPage({ title, description, children }: { title: string; description: string; children: (ctx: Context) => React.ReactNode }) {
  return <AuthGuard fallback={<OpsSkeleton />}><OpsShell title={title} description={description}>{children}</OpsShell></AuthGuard>;
}

function OpsShell({ title, description, children }: { title: string; description: string; children: (ctx: Context) => React.ReactNode }) {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();
  if (tenant.isLoading || me.isLoading) return <OpsSkeleton />;
  if (tenant.error || me.error || !tenant.data || !me.data) return <main className="container mx-auto max-w-4xl px-4 py-10"><Alert variant="destructive"><AlertTitle>Tidak bisa memuat operasional akademik</AlertTitle><AlertDescription>Coba muat ulang halaman.</AlertDescription></Alert></main>;

  const opsModule = tenant.data.modules.find((item) => item.feature_code === "academic_ops");
  const canManage = Boolean(opsModule?.plan_entitled && opsModule.enabled);
  const upgradeMessage = opsModule?.plan_entitled ? "Aktifkan modul Academic Ops terlebih dahulu." : "Upgrade plan untuk mengelola operasional akademik.";

  return (
    <SidebarLayout schoolName={tenant.data.school_name} userName={me.data.full_name} userEmail={me.data.email} isLoggingOut={logout.isPending} onLogout={async () => { await logout.mutateAsync(); router.push("/login"); }} className="mx-auto max-w-6xl">
      <div className="space-y-4">
        <div><h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
        <div className="flex flex-wrap gap-2">{opsNav.map((item) => <Button key={item.href} asChild size="sm" variant={pathname === item.href ? "default" : "outline"}><Link href={item.href}>{item.label}</Link></Button>)}</div>
      </div>
      {!canManage ? <Alert><AlertTitle>Kontrol dibatasi</AlertTitle><AlertDescription>{upgradeMessage}</AlertDescription></Alert> : null}
      {children({ canManage, upgradeMessage })}
    </SidebarLayout>
  );
}

export function StudentsPanel({ canManage, upgradeMessage }: Context) {
  const students = useStudents();
  const create = useCreateStudent();
  const update = useUpdateStudent("");
  const form = useForm<StudentForm>({ resolver: zodResolver(studentSchema), defaultValues: { nis: "", full_name: "", gender: "female", birth_date: "" } });
  const [editing, setEditing] = React.useState<Student | null>(null);
  async function submit(values: StudentForm) { await create.mutateAsync(values); form.reset(); toast.success("Siswa ditambahkan."); }
  return <ResourceCard title="Data Siswa" description="Tambah dan edit siswa tenant.">{students.isLoading ? <ListSkeleton /> : <div className="grid gap-3 lg:grid-cols-[1fr_360px]"><List items={students.data ?? []} empty="Belum ada siswa" render={(s) => <div className="flex items-center justify-between"><span>{s.full_name}<span className="ml-2 text-xs text-muted-foreground">{s.nis}</span></span><Button size="sm" variant="outline" onClick={() => setEditing(s)}>Edit</Button></div>} /><StudentFormView form={form} canManage={canManage} upgradeMessage={upgradeMessage} loading={create.isPending} onSubmit={submit} />{editing ? <EditStudentDialog student={editing} onClose={() => setEditing(null)} mutation={update} /> : null}</div>}</ResourceCard>;
}

function EditStudentDialog({ student, onClose, mutation }: { student: Student; onClose: () => void; mutation: ReturnType<typeof useUpdateStudent> }) {
  const form = useForm<StudentForm>({ resolver: zodResolver(studentSchema), defaultValues: { nis: student.nis, full_name: student.full_name, gender: student.gender as StudentForm["gender"], birth_date: student.birth_date } });
  const save = useUpdateStudent(student.student_id);
  return <Card className="border-primary/30"><CardHeader><CardTitle>Edit {student.full_name}</CardTitle></CardHeader><CardContent><StudentFormView form={form} canManage upgradeMessage="" loading={save.isPending || mutation.isPending} onSubmit={async (values) => { await save.mutateAsync(values); toast.success("Siswa diperbarui."); onClose(); }} /><Button className="mt-3" variant="outline" onClick={onClose}>Tutup</Button></CardContent></Card>;
}

function StudentFormView({ form, canManage, upgradeMessage, loading, onSubmit }: { form: ReturnType<typeof useForm<StudentForm>>; canManage: boolean; upgradeMessage: string; loading: boolean; onSubmit: (values: StudentForm) => Promise<void> }) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 rounded-lg border p-4">
        <Field control={form.control} name="nis" label="NIS" />
        <Field control={form.control} name="full_name" label="Nama lengkap" />
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">Laki-laki</SelectItem>
                  <SelectItem value="female">Perempuan</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Field control={form.control} name="birth_date" label="Tanggal lahir" type="date" />
        <GuardedButton enabled={canManage} message={upgradeMessage} loading={loading}>Simpan Siswa</GuardedButton>
      </form>
    </Form>
  );
}

export function TeachersPanel({ canManage, upgradeMessage }: Context) {
  const teachers = useTeachers();
  const users = useTenantUsers();
  const create = useCreateTeacher();
  const link = useLinkTeacherAccount();
  const form = useForm<TeacherForm>({ resolver: zodResolver(teacherSchema), defaultValues: { nip: "", full_name: "" } });
  const teacherUsers = (users.data ?? []).filter((user) => user.role_code === "teacher" || user.role_code === "homeroom_teacher");
  return <ResourceCard title="Data Guru" description="Kelola master data guru dan hubungkan dengan akun login guru.">{teachers.isLoading ? <ListSkeleton /> : <div className="grid gap-3 lg:grid-cols-[1fr_360px]"><List items={teachers.data ?? []} empty="Belum ada guru" render={(t) => <div className="space-y-2"><div><span>{t.full_name}<span className="ml-2 text-xs text-muted-foreground">{t.nip}</span></span><p className="text-xs text-muted-foreground">{t.user_id ? "Akun guru sudah terhubung" : "Belum terhubung ke akun login"}</p></div><div className="flex gap-2"><QuerySelect items={teacherUsers} isLoading={users.isLoading} value={t.user_id ?? ""} onValueChange={async (userId) => { await link.mutateAsync({ teacherId: t.teacher_id, userId }); toast.success("Akun guru terhubung."); }} getValue={(user) => user.user_id} getLabel={(user) => `${user.full_name} (${user.email})`} placeholder="Hubungkan akun guru" emptyText="Belum ada akun guru" /><Button size="sm" variant="outline" loading={link.isPending} disabled={!canManage || link.isPending}>Link</Button></div></div>} /><Form {...form}><form onSubmit={form.handleSubmit(async (values) => { await create.mutateAsync(values); form.reset(); toast.success("Guru ditambahkan."); })} className="space-y-3 rounded-lg border p-4"><Field control={form.control} name="nip" label="NIP" /><Field control={form.control} name="full_name" label="Nama lengkap" /><GuardedButton enabled={canManage} message={upgradeMessage} loading={create.isPending}>Simpan Guru</GuardedButton></form></Form></div>}</ResourceCard>;
}

export function HomeroomsPanel({ canManage, upgradeMessage }: Context) {
  const years = useAcademicYears();
  const homerooms = useHomerooms();
  const students = useStudents();
  const create = useCreateHomeroom();
  const [selected, setSelected] = React.useState<string>();
  const roster = useHomeroomRoster(selected);
  const enroll = useEnrollStudent(selected);
  const form = useForm<HomeroomForm>({ resolver: zodResolver(homeroomSchema), defaultValues: { name: "", grade_level: "", capacity: 32, academic_year_id: "" } });
  const enrollForm = useForm<EnrollmentForm>({ resolver: zodResolver(enrollmentSchema), defaultValues: { student_id: "", homeroom_id: "", transfer: false } });
  const activeYears = (years.data ?? []).filter((year) => year.status === "Active");
  return <ResourceCard title="Kelas dan Roster" description="Buat homeroom aktif dan enroll siswa."><div className="grid gap-3 lg:grid-cols-[1fr_360px]"><div className="space-y-3"><List items={homerooms.data ?? []} empty="Belum ada kelas" render={(h) => <Button className="w-full justify-start" variant={selected === h.homeroom_id ? "default" : "outline"} onClick={() => { setSelected(h.homeroom_id); enrollForm.setValue("homeroom_id", h.homeroom_id); }}>{h.name} - kelas {h.grade_level}</Button>} />{selected ? <List items={roster.data ?? []} empty="Roster kosong" render={(s) => <span>{s.full_name}</span>} /> : null}</div><div className="space-y-3"><Form {...form}><form onSubmit={form.handleSubmit(async (values) => { await create.mutateAsync(values); form.reset(); toast.success("Kelas dibuat."); })} className="space-y-3 rounded-lg border p-4"><Field control={form.control} name="name" label="Nama kelas" /><Field control={form.control} name="grade_level" label="Tingkat" /><Field control={form.control} name="capacity" label="Kapasitas" type="number" /><FormField control={form.control} name="academic_year_id" render={({ field }) => <FormItem><FormLabel>Tahun aktif</FormLabel><FormControl><QuerySelect items={activeYears} isLoading={years.isLoading} value={field.value} onValueChange={field.onChange} getValue={(y) => y.academic_year_id} getLabel={(y) => y.name} placeholder="Pilih tahun aktif" emptyText="Tidak ada tahun aktif" /></FormControl><FormMessage /></FormItem>} /><GuardedButton enabled={canManage} message={upgradeMessage} loading={create.isPending}>Buat Kelas</GuardedButton></form></Form><Form {...enrollForm}><form onSubmit={enrollForm.handleSubmit(async (values) => { await enroll.mutateAsync(values); toast.success("Siswa dienroll."); })} className="space-y-3 rounded-lg border p-4"><FormField control={enrollForm.control} name="student_id" render={({ field }) => <FormItem><FormLabel>Siswa</FormLabel><FormControl><QuerySelect items={students.data ?? []} isLoading={students.isLoading} value={field.value} onValueChange={field.onChange} getValue={(s) => s.student_id} getLabel={(s) => s.full_name} placeholder="Pilih siswa" emptyText="Belum ada siswa" /></FormControl><FormMessage /></FormItem>} /><GuardedButton enabled={canManage && Boolean(selected)} message={selected ? upgradeMessage : "Pilih kelas dahulu."} loading={enroll.isPending}>Enroll</GuardedButton></form></Form></div></div></ResourceCard>;
}

export function TeachingAssignmentsPanel({ canManage, upgradeMessage }: Context) {
  const years = useAcademicYears();
  const homerooms = useHomerooms();
  const teachers = useTeachers();
  const [yearId, setYearId] = React.useState("");
  const curriculum = useCurriculumVersions(yearId);
  const [curriculumId, setCurriculumId] = React.useState("");
  const subjects = useSubjects(curriculumId);
  const [homeroomId, setHomeroomId] = React.useState("");
  const assignments = useTeachingAssignments(homeroomId);
  const assign = useAssignTeaching(homeroomId);
  const form = useForm<TeachingAssignmentForm>({ resolver: zodResolver(teachingAssignmentSchema), defaultValues: { teacher_id: "", subject_id: "", homeroom_id: "", academic_year_id: "" } });
  const activeYears = (years.data ?? []).filter((y) => y.status === "Active");
  const filteredHomerooms = (homerooms.data ?? []).filter((h) => !yearId || h.academic_year_id === yearId);
  const teacherById = React.useMemo(() => new Map((teachers.data ?? []).map((t) => [t.teacher_id, t.full_name])), [teachers.data]);
  const subjectById = React.useMemo(() => new Map((subjects.data ?? []).map((s) => [s.subject_id, s.name])), [subjects.data]);
  function onYearChange(id: string) { setYearId(id); setCurriculumId(""); setHomeroomId(""); form.setValue("homeroom_id", ""); form.setValue("subject_id", ""); }
  function onCurriculumChange(id: string) { setCurriculumId(id); form.setValue("subject_id", ""); }
  return <ResourceCard title="Penugasan Mengajar" description="Hubungkan guru, subject, kelas, dan tahun ajaran."><div className="grid gap-3 lg:grid-cols-[1fr_360px]"><List items={assignments.data ?? []} empty="Pilih kelas untuk melihat penugasan" render={(a) => <span>{teacherById.get(a.teacher_id) ?? a.teacher_id} → {subjectById.get(a.subject_id) ?? a.subject_id}</span>} /><Form {...form}><form onSubmit={form.handleSubmit(async (values) => { await assign.mutateAsync(values); toast.success("Penugasan dibuat."); })} className="space-y-3 rounded-lg border p-4"><QueryField form={form} name="academic_year_id" label="Tahun" items={activeYears} loading={years.isLoading} getValue={(y) => y.academic_year_id} getLabel={(y) => y.name} onChange={onYearChange} /><QuerySelect items={curriculum.data ?? []} isLoading={curriculum.isLoading} value={curriculumId} onValueChange={onCurriculumChange} getValue={(c) => c.curriculum_version_id} getLabel={(c) => c.name} placeholder="Pilih kurikulum" emptyText="Belum ada kurikulum" /><QueryField form={form} name="homeroom_id" label="Kelas" items={filteredHomerooms} loading={homerooms.isLoading} getValue={(h) => h.homeroom_id} getLabel={(h) => h.name} onChange={setHomeroomId} /><QueryField form={form} name="teacher_id" label="Guru" items={teachers.data ?? []} loading={teachers.isLoading} getValue={(t) => t.teacher_id} getLabel={(t) => t.full_name} /><QueryField form={form} name="subject_id" label="Subject" items={subjects.data ?? []} loading={subjects.isLoading} getValue={(s) => s.subject_id} getLabel={(s) => s.name} /><GuardedButton enabled={canManage} message={upgradeMessage} loading={assign.isPending}>Assign</GuardedButton></form></Form></div></ResourceCard>;
}

export function ImportPanel({ canManage, upgradeMessage }: Context) {
  const importStudents = useImportStudents();
  const importTeachers = useImportTeachers();
  const [studentFile, setStudentFile] = React.useState<File | null>(null);
  const [teacherFile, setTeacherFile] = React.useState<File | null>(null);
  const [rowErrors, setRowErrors] = React.useState<Array<{ row: number; errors: Record<string, string[]> }>>([]);
  async function runUpload(action: () => Promise<{ imported: number }>, label: string) {
    try { setRowErrors([]); const out = await action(); toast.success(`${out.imported} ${label} diimport.`); }
    catch (err) { const rows = extractImportRows(err); setRowErrors(rows); toast.error(getErrorMessage(err, { fallback: rows.length ? "Import gagal. Periksa error baris." : "Import gagal." })); }
  }
  return <ResourceCard title="Import Excel" description="Upload file Excel untuk import data siswa atau guru secara massal."><div className="grid gap-4 md:grid-cols-2"><ImportBox title="Import Siswa" templateHref="/templates/students-template.xlsx" templateLabel="Unduh Template Siswa" file={studentFile} setFile={setStudentFile} loading={importStudents.isPending} canManage={canManage} message={upgradeMessage} onUpload={() => runUpload(() => importStudents.mutateAsync(studentFile as File), "siswa")} /><ImportBox title="Import Guru" templateHref="/templates/teachers-template.xlsx" templateLabel="Unduh Template Guru" file={teacherFile} setFile={setTeacherFile} loading={importTeachers.isPending} canManage={canManage} message={upgradeMessage} onUpload={() => runUpload(() => importTeachers.mutateAsync(teacherFile as File), "guru")} /></div>{rowErrors.length ? <Alert variant="destructive" className="mt-4"><AlertTitle>Import validation failed</AlertTitle><AlertDescription><div className="space-y-1">{rowErrors.map((row) => <p key={row.row}>Baris {row.row}: {Object.entries(row.errors).map(([field, messages]) => `${field} ${messages.join(", ")}`).join("; ")}</p>)}</div></AlertDescription></Alert> : null}</ResourceCard>;
}

function extractImportRows(err: unknown): Array<{ row: number; errors: Record<string, string[]> }> {
  if (!(err instanceof ApiHttpError) || typeof err.payload !== "object" || err.payload === null) return [];
  const rows = (err.payload as { rows?: unknown }).rows;
  return Array.isArray(rows) ? rows as Array<{ row: number; errors: Record<string, string[]> }> : [];
}

function ImportBox({ title, templateHref, templateLabel, file, setFile, loading, canManage, message, onUpload }: { title: string; templateHref: string; templateLabel: string; file: File | null; setFile: (file: File | null) => void; loading: boolean; canManage: boolean; message: string; onUpload: () => Promise<void> }) {
  return <div className="space-y-3 rounded-lg border p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">{title}</h3><Button asChild size="sm" variant="outline"><a href={templateHref} download>{templateLabel}</a></Button></div><Input type="file" accept=".xlsx,.xls,.ods" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><GuardedButton enabled={canManage && Boolean(file)} message={file ? message : "Pilih file terlebih dahulu."} loading={loading} onClick={onUpload}>Upload</GuardedButton></div>;
}

function ResourceCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>; }
function OpsSkeleton() { return <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10"><Skeleton className="h-9 w-56" /><Skeleton className="h-40 w-full" /></main>; }
function ListSkeleton() { return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>; }
function List<T>({ items, empty, render }: { items: T[]; empty: string; render: (item: T) => React.ReactNode }) { if (items.length === 0) return <p className="rounded-lg border p-4 text-sm text-muted-foreground">{empty}</p>; return <div className="space-y-2">{items.map((item, i) => <div key={i} className="rounded-lg border p-3 text-sm">{render(item)}</div>)}</div>; }
function Field({ control, name, label, type = "text" }: { control: any; name: string; label: string; type?: string }) { return <FormField control={control} name={name as never} render={({ field }) => <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type={type} {...field} /></FormControl><FormMessage /></FormItem>} />; }
function QueryField<T>({ form, name, label, items, loading, getValue, getLabel, onChange }: { form: any; name: string; label: string; items: T[]; loading: boolean; getValue: (item: T) => string; getLabel: (item: T) => string; onChange?: (value: string) => void }) { return <FormField control={form.control} name={name as never} render={({ field }) => <FormItem><FormLabel>{label}</FormLabel><FormControl><QuerySelect items={items} isLoading={loading} value={field.value} onValueChange={(value) => { field.onChange(value); onChange?.(value); }} getValue={getValue} getLabel={getLabel} placeholder={`Pilih ${label.toLowerCase()}`} emptyText="Data kosong" /></FormControl><FormMessage /></FormItem>} />; }
function GuardedButton({ enabled, message, loading, children, onClick }: { enabled: boolean; message: string; loading: boolean; children: React.ReactNode; onClick?: () => Promise<void> }) { const button = <Button type={onClick ? "button" : "submit"} disabled={!enabled} loading={loading} onClick={onClick}>{children}</Button>; if (enabled) return button; return <Tooltip><TooltipTrigger asChild><span className="inline-flex">{button}</span></TooltipTrigger><TooltipContent>{message}</TooltipContent></Tooltip>; }
