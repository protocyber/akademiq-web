"use client";

import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useDashboardStats } from "@/lib/query/queries/use-dashboard-stats";
import { useSubjectsForYear } from "@/lib/query/queries/use-academic-config";
import { useAcademicScope } from "@/hooks/use-academic-scope";

import { DashboardWelcome } from "./_components/dashboard-welcome";
import { DashboardKpiCards } from "./_components/dashboard-kpi-cards";
import { DashboardCharts } from "./_components/dashboard-charts";

export default function DashboardPage() {
  return (
    <AuthGuard fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardSkeletonInner() {
  return (
    <main className="container mx-auto max-w-7xl space-y-6 px-4 py-10">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-5 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-[350px] lg:col-span-3 rounded-xl" />
        <Skeleton className="h-[350px] lg:col-span-2 rounded-xl" />
      </div>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <SidebarLayout>
      <DashboardSkeletonInner />
    </SidebarLayout>
  );
}

function DashboardContent() {
  const me = useMe();
  const tenant = useTenantMe();
  const logout = useLogout();
  const router = useRouter();
  const { yearId } = useAcademicScope();

  const stats = useDashboardStats();
  const subjects = useSubjectsForYear(yearId || undefined);

  if (tenant.isLoading || me.isLoading) {
    return <DashboardSkeleton />;
  }

  if (tenant.error || me.error) {
    return (
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat dasbor</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Periksa koneksi dan coba lagi.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  tenant.refetch();
                  me.refetch();
                }}
              >
                Coba lagi
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await logout.mutateAsync();
                  router.push("/login");
                }}
              >
                Keluar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const t = tenant.data!;
  const u = me.data!;

  return (
    <SidebarLayout
      schoolName={t.school_name}
      userName={u.full_name}
      userEmail={u.email}
      isLoggingOut={logout.isPending}
      onLogout={async () => {
        await logout.mutateAsync();
        router.push("/login");
      }}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <DashboardWelcome userName={u.full_name} />

        {/* No academic year selected — empty state */}
        {!yearId ? (
          <EmptyStateNoYear />
        ) : stats.isLoading || !stats.data ? (
          <DashboardSkeletonInner />
        ) : stats.error ? (
          <Alert variant="destructive">
            <AlertTitle>Gagal memuat statistik</AlertTitle>
            <AlertDescription>
              Tidak bisa memuat data dasbor. Coba muat ulang halaman.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <DashboardKpiCards
              stats={stats.data}
              subjectCount={subjects.data?.length ?? 0}
            />
            <DashboardCharts stats={stats.data} />
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

function EmptyStateNoYear() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
      <div className="mb-4 text-4xl">📅</div>
      <h3 className="text-lg font-semibold">
        Mulai Siapkan Tahun Ajaran Anda
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Belum ada tahun ajaran aktif. Buat dan konfigurasikan tahun ajaran
        terlebih dahulu untuk melihat statistik sekolah.
      </p>
      <Button className="mt-4" onClick={() => router.push("/settings/academic/years")}>
        Konfigurasi Tahun Ajaran
      </Button>
    </div>
  );
}
