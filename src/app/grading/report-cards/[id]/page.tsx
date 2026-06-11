"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useTransitionReportCard } from "@/lib/query/mutations/use-grading";
import { useCurriculumVersions, useSubjects } from "@/lib/query/queries/use-academic-config";
import { useHomeroomRoster, useTeachers, useTeachingAssignments } from "@/lib/query/queries/use-academic-ops";
import { ReportCardStatus, useReportCardDetail } from "@/lib/query/queries/use-grading";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";

export default function ReportCardDetailPage() {
  return <AuthGuard fallback={<PageSkeleton />}><ReportCardDetailShell /></AuthGuard>;
}

function ReportCardDetailShell() {
  const params = useParams<{ id: string }>();
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  const detail = useReportCardDetail(params.id);
  const card = detail.data?.report_card;
  const roster = useHomeroomRoster(card?.homeroom_id);
  const curriculum = useCurriculumVersions(card?.academic_year_id);
  const curriculumId = curriculum.data?.[0]?.curriculum_version_id;
  const subjects = useSubjects(curriculumId);
  const assignments = useTeachingAssignments(card?.homeroom_id);
  const teachers = useTeachers();
  if (tenant.isLoading || me.isLoading || detail.isLoading) return <PageSkeleton />;
  if (tenant.error || me.error || detail.error || !tenant.data || !me.data || !detail.data || !card) {
    return <main className="container mx-auto max-w-4xl px-4 py-10"><Alert variant="destructive"><AlertTitle>Rapor tidak bisa dimuat</AlertTitle><AlertDescription>Coba muat ulang halaman.</AlertDescription></Alert></main>;
  }
  const studentName = (roster.data ?? []).find((student) => student.student_id === card.student_id)?.full_name;
  const subjectNameById = new Map((subjects.data ?? []).map((subject) => [subject.subject_id, subject.name]));
  const teacherNameById = new Map((teachers.data ?? []).map((teacher) => [teacher.teacher_id, teacher.full_name]));
  const teacherNameByUserId = new Map((teachers.data ?? []).flatMap((teacher) => teacher.user_id ? [[teacher.user_id, teacher.full_name] as const] : []));
  const teacherNameBySubjectId = new Map((assignments.data ?? []).map((assignment) => [assignment.subject_id, teacherNameById.get(assignment.teacher_id)]));
  return (
    <SidebarLayout schoolName={tenant.data.school_name} userName={me.data.full_name} userEmail={me.data.email} isLoggingOut={logout.isPending} onLogout={async () => { await logout.mutateAsync(); router.push("/login"); }} className="mx-auto max-w-5xl">
      <div className="space-y-2"><h1 className="font-display text-3xl font-extrabold tracking-tight">Detail Rapor</h1><p className="text-sm text-muted-foreground">{studentName ?? "Siswa tidak ditemukan"} - Status saat ini: <span className="font-semibold text-foreground">{statusLabel(card.status)}</span></p></div>
      <CurrentAction reportCardId={card.report_card_id} status={card.status} homeroomId={card.homeroom_id} academicYearId={card.academic_year_id} />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card><CardHeader><CardTitle>Nilai dan Kelulusan</CardTitle><CardDescription>Pass/fail berasal dari kebijakan nilai saat draft dibuat.</CardDescription></CardHeader><CardContent className="space-y-3">{detail.data.grades.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada nilai.</p> : detail.data.grades.map((grade) => { const summary = card.summary.subjects?.find((item) => item.subject_id === grade.subject_id); const teacherName = teacherNameBySubjectId.get(grade.subject_id) ?? teacherNameByUserId.get(grade.recorded_by); return <div key={grade.grade_id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><div><p className="font-medium">{subjectNameById.get(grade.subject_id) ?? "Subject tidak ditemukan"}</p><p className="text-xs text-muted-foreground">Guru: {teacherName ?? "Guru tidak ditemukan"} - Nilai {grade.score}</p></div><span className={summary?.passed ? "text-emerald-600" : "text-destructive"}>{summary?.passed ? "Lulus" : "Remedial"}</span></div>; })}</CardContent></Card>
        <Card><CardHeader><CardTitle>Riwayat Approval</CardTitle><CardDescription>Audit trail setiap transisi.</CardDescription></CardHeader><CardContent className="space-y-3">{detail.data.approvals.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada approval.</p> : detail.data.approvals.map((approval) => <div key={approval.approval_id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{approval.action}</p><p className="text-xs text-muted-foreground">{roleLabel(approval.role)} oleh {teacherNameByUserId.get(approval.approver_id) ?? "Approver tidak ditemukan"}</p>{approval.note ? <p className="mt-1 text-xs">{approval.note}</p> : null}</div>)}</CardContent></Card>
      </div>
    </SidebarLayout>
  );
}

function CurrentAction({ reportCardId, status, homeroomId, academicYearId }: { reportCardId: string; status: ReportCardStatus; homeroomId: string; academicYearId: string }) {
  const transition = useTransitionReportCard(reportCardId, homeroomId, academicYearId);
  async function run(action: "submit" | "homeroom-approve" | "return" | "principal-approve" | "reject") {
    try {
      await transition.mutateAsync({ action });
      toast.success("Status rapor diperbarui.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Aksi rapor gagal." }));
    }
  }
  return <Card><CardContent className="flex flex-wrap gap-2 p-4">{status === "Draft" ? <Button loading={transition.isPending} onClick={() => run("submit")}>Submit ke Wali Kelas</Button> : null}{status === "HomeroomReview" ? <><Button loading={transition.isPending} onClick={() => run("homeroom-approve")}>Approve ke Kepala Sekolah</Button><Button variant="outline" loading={transition.isPending} onClick={() => run("return")}>Return ke Draft</Button></> : null}{status === "PrincipalApproval" ? <><Button loading={transition.isPending} onClick={() => run("principal-approve")}>Publish</Button><Button variant="outline" loading={transition.isPending} onClick={() => run("reject")}>Reject ke Wali Kelas</Button></> : null}{status === "Published" || status === "Archived" ? <p className="text-sm text-muted-foreground">Rapor sudah read-only.</p> : null}</CardContent></Card>;
}

function statusLabel(status: ReportCardStatus) {
  return status === "HomeroomReview" ? "Review Wali Kelas" : status === "PrincipalApproval" ? "Persetujuan Kepala Sekolah" : status;
}

function roleLabel(role: string) {
  if (role === "subject_teacher") return "Guru subject";
  if (role === "homeroom_teacher") return "Wali kelas";
  if (role === "principal") return "Kepala sekolah";
  return role;
}

function PageSkeleton() { return <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10"><Skeleton className="h-9 w-56" /><Skeleton className="h-64 w-full" /></main>; }
