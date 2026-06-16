"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuerySelect } from "@/components/ui/query-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useAcademicYears } from "@/lib/query/queries/use-academic-config";
import { useReportTypes } from "@/lib/query/queries/use-grading";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";

export default function ReportCardsPage() {
  return (
    <AuthGuard fallback={<PageSkeleton />}>
      <ReportCardsShell />
    </AuthGuard>
  );
}

function ReportCardsShell() {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  if (tenant.isLoading || me.isLoading) return <PageSkeleton />;
  if (tenant.error || me.error || !tenant.data || !me.data) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat rapor</AlertTitle>
          <AlertDescription>Coba muat ulang halaman.</AlertDescription>
        </Alert>
      </main>
    );
  }
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
      className="mx-auto max-w-7xl"
    >
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Rapor</h1>
        <p className="text-sm text-muted-foreground">
          Pilih tahun, lalu buka jenis rapor untuk memilih kelas dan menjalankan workflow persetujuan.
        </p>
      </div>
      <ReportTypeList />
    </SidebarLayout>
  );
}

function ReportTypeList() {
  const years = useAcademicYears();
  const [yearId, setYearId] = React.useState("");
  const reportTypes = useReportTypes(yearId);
  const router = useRouter();

  const activeYears = (years.data ?? []).filter((year) => year.status === "Active");

  function openReportType(reportTypeId: string) {
    router.push(`/grading/report-cards/${reportTypeId}/classroom`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jenis Rapor</CardTitle>
        <CardDescription>Pilih tahun untuk melihat jenis rapor yang tersedia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <QuerySelect
          items={activeYears}
          isLoading={years.isLoading}
          value={yearId}
          onValueChange={setYearId}
          getValue={(year) => year.academic_year_id}
          getLabel={(year) => year.name}
          placeholder="Pilih tahun aktif"
          emptyText="Belum ada tahun aktif"
        />
        {!yearId ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Pilih tahun untuk melihat jenis rapor.</p>
        ) : reportTypes.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (reportTypes.data ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Belum ada jenis rapor untuk tahun ini. Tambahkan dari Pengaturan → Tahun Ajaran.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(reportTypes.data ?? []).map((reportType) => (
                  <tr key={reportType.report_type_id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{reportType.code}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{reportType.name}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => openReportType(reportType.report_type_id)}>Buka Rapor</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}
