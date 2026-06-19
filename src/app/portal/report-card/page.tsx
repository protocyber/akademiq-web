"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useAcademicYears, useSubjectsForYear } from "@/lib/query/queries/use-academic-config";
import { useMyReportCards, useMyReportCardDetail } from "@/lib/query/queries/use-grading";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { groupScoresByKelompok } from "@/components/features/grading/report-card-detail-body";

export default function PublishedReportCardPage() {
  return <AuthGuard fallback={<PageSkeleton />}><PublishedReportCardShell /></AuthGuard>;
}

function PublishedReportCardShell() {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  const params = useSearchParams();

  const yearsQuery = useAcademicYears();
  const [academicYearId, setAcademicYearId] = React.useState("");

  // Default to first academic year once loaded
  React.useEffect(() => {
    if (yearsQuery.data && yearsQuery.data.length > 0 && !academicYearId) {
      setAcademicYearId(params.get("academic_year_id") ?? yearsQuery.data[0].academic_year_id);
    }
  }, [yearsQuery.data, academicYearId, params]);

  const myReportCardsQuery = useMyReportCards(academicYearId || undefined);

  // Extract unique student IDs from the report cards
  const studentIds = React.useMemo(() => {
    if (!myReportCardsQuery.data) return [];
    const set = new Set(myReportCardsQuery.data.map((rc) => rc.student_id));
    return Array.from(set);
  }, [myReportCardsQuery.data]);

  const [studentId, setStudentId] = React.useState("");

  // Initialize selected student from query param or default to first student
  React.useEffect(() => {
    const paramId = params.get("student_id");
    if (studentIds.length > 0) {
      if (paramId) {
        setStudentId(paramId);
      } else if (!studentId || !studentIds.includes(studentId)) {
        setStudentId(studentIds[0]);
      }
    } else {
      setStudentId("");
    }
  }, [studentIds, studentId, params]);

  const isDeepLinkUnauthorized = Boolean(studentId && studentIds.length > 0 && !studentIds.includes(studentId));

  // Fetch report card detail only if authorized
  const report = useMyReportCardDetail(
    studentId && !isDeepLinkUnauthorized ? studentId : undefined,
    academicYearId || undefined
  );
  const subjects = useSubjectsForYear(academicYearId || undefined);

  if (tenant.isLoading || me.isLoading || yearsQuery.isLoading || (academicYearId && myReportCardsQuery.isLoading)) {
    return <PageSkeleton />;
  }

  if (tenant.error || me.error || !tenant.data || !me.data) {
    return (
      <main className="container mx-auto w-full px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Portal tidak bisa dimuat</AlertTitle>
          <AlertDescription>Coba muat ulang halaman.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const hasNoLinkedStudents = studentIds.length === 0;

  return (
    <SidebarLayout
      schoolName={tenant.data.school_name}
      userName={me.data.full_name}
      userEmail={me.data.email}
      isLoggingOut={logout.isPending}
      onLogout={async () => {
        await logout.mutateAsync();
        router.push("/login");
      }}
      className="mx-auto w-full"
    >
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Rapor Terbit</h1>
        <p className="text-sm text-muted-foreground">
          Tampilan read-only untuk siswa dan orang tua. Rapor yang belum terbit tidak ditampilkan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pilih Rapor</CardTitle>
          <CardDescription>Pilih anak dan tahun akademik untuk melihat rapor.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Tahun Akademik</label>
            <Select value={academicYearId} onValueChange={setAcademicYearId}>
              <SelectTrigger id="year-select">
                <SelectValue placeholder="Pilih Tahun Akademik" />
              </SelectTrigger>
              <SelectContent>
                {yearsQuery.data?.map((y) => (
                  <SelectItem key={y.academic_year_id} value={y.academic_year_id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Pilih Anak</label>
            <Select value={studentId} onValueChange={setStudentId} disabled={hasNoLinkedStudents || isDeepLinkUnauthorized}>
              <SelectTrigger id="student-select">
                <SelectValue placeholder="Pilih Anak" />
              </SelectTrigger>
              <SelectContent>
                {studentIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    Siswa #{id.slice(-4)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isDeepLinkUnauthorized ? (
        <Alert variant="destructive">
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>Anda tidak memiliki akses ke rapor siswa ini.</AlertDescription>
        </Alert>
      ) : null}

      {hasNoLinkedStudents && !isDeepLinkUnauthorized ? (
        <Alert>
          <AlertTitle>Belum ada siswa terhubung</AlertTitle>
          <AlertDescription>Belum ada profil siswa yang terhubung dengan akun Anda.</AlertDescription>
        </Alert>
      ) : null}

      {!hasNoLinkedStudents && !isDeepLinkUnauthorized && studentId && report.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : null}

      {!hasNoLinkedStudents && !isDeepLinkUnauthorized && studentId && report.error ? (
        <Alert>
          <AlertTitle>Rapor belum tersedia</AlertTitle>
          <AlertDescription>Rapor belum dipublikasikan atau tidak ditemukan.</AlertDescription>
        </Alert>
      ) : null}

      {!hasNoLinkedStudents && !isDeepLinkUnauthorized && report.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Rapor Siswa</CardTitle>
            <CardDescription>Status {report.data.report_card.status}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.data.subject_scores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada nilai final.</p>
            ) : (
              groupScoresByKelompok(
                report.data.subject_scores,
                new Map((subjects.data ?? []).map((s) => [s.subject_id, s])),
                report.data.report_card.summary.subjects,
              ).map((group) => (
                <div key={group.key} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  {group.rows.map((row) => (
                    <div
                      key={`${row.score.report_card_id}-${row.score.subject_id}`}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <span>{row.name}</span>
                      <span>
                        {row.score.final_score.toFixed(1)} - {row.passed ? "Lulus" : "Remedial"}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </SidebarLayout>
  );
}

function PageSkeleton() {
  return (
    <main className="container mx-auto w-full space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}
