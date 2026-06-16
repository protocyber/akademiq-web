"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { usePublishedReportCard } from "@/lib/query/queries/use-grading";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";

export default function PublishedReportCardPage() {
  return <AuthGuard fallback={<PageSkeleton />}><PublishedReportCardShell /></AuthGuard>;
}

function PublishedReportCardShell() {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  const params = useSearchParams();
  const [studentId, setStudentId] = React.useState(params.get("student_id") ?? "");
  const [academicYearId, setAcademicYearId] = React.useState(params.get("academic_year_id") ?? "");
  const report = usePublishedReportCard(studentId, academicYearId);
  if (tenant.isLoading || me.isLoading) return <PageSkeleton />;
  if (tenant.error || me.error || !tenant.data || !me.data) return <main className="container mx-auto max-w-7xl px-4 py-10"><Alert variant="destructive"><AlertTitle>Portal tidak bisa dimuat</AlertTitle><AlertDescription>Coba muat ulang halaman.</AlertDescription></Alert></main>;
  return (
    <SidebarLayout schoolName={tenant.data.school_name} userName={me.data.full_name} userEmail={me.data.email} isLoggingOut={logout.isPending} onLogout={async () => { await logout.mutateAsync(); router.push("/login"); }} className="mx-auto max-w-7xl">
      <div className="space-y-2"><h1 className="font-display text-3xl font-extrabold tracking-tight">Rapor Terbit</h1><p className="text-sm text-muted-foreground">Tampilan read-only untuk siswa dan orang tua. Rapor yang belum terbit tidak ditampilkan.</p></div>
      <Card><CardHeader><CardTitle>Cari Rapor</CardTitle><CardDescription>Masukkan ID siswa dan tahun akademik.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><Input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="student_id" /><Input value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)} placeholder="academic_year_id" /></CardContent></Card>
      {studentId && academicYearId && report.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {studentId && academicYearId && report.error ? <Alert><AlertTitle>Rapor belum tersedia</AlertTitle><AlertDescription>Rapor belum dipublikasikan atau tidak ditemukan.</AlertDescription></Alert> : null}
      {report.data ? <Card><CardHeader><CardTitle>Rapor Siswa</CardTitle><CardDescription>Status {report.data.report_card.status}</CardDescription></CardHeader><CardContent className="space-y-3">{report.data.subject_scores.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada nilai final.</p> : report.data.subject_scores.map((score) => { const subjectRow = report.data?.report_card.summary.subjects?.find((item) => item.subject_id === score.subject_id); return <div key={`${score.report_card_id}-${score.subject_id}`} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>Mapel #{score.subject_id.slice(-4)}</span><span>{score.final_score.toFixed(1)} - {subjectRow?.passed ? "Lulus" : "Remedial"}</span></div>; })}</CardContent></Card> : null}
    </SidebarLayout>
  );
}

function PageSkeleton() { return <main className="container mx-auto max-w-7xl space-y-6 px-4 py-10"><Skeleton className="h-9 w-56" /><Skeleton className="h-64 w-full" /></main>; }
