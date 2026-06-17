"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useMe } from "@/lib/query/queries/use-me";
import { useLogout } from "@/lib/query/mutations/use-logout";

export default function DashboardPage() {
  return (
    <AuthGuard fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardSkeleton() {
  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-6 w-1/3" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}

function DashboardContent() {
  const me = useMe();
  const tenant = useTenantMe();
  const logout = useLogout();
  const router = useRouter();

  if (tenant.isLoading || me.isLoading) {
    return <DashboardSkeleton />;
  }

  if (tenant.error || me.error) {
    return (
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat dashboard</AlertTitle>
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
      <div>
        <h1 className="text-3xl font-extrabold font-display tracking-tight text-foreground">Dasbor Sekolah</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pantau status langganan dan atur modul aktif sekolah Anda.
        </p>
      </div>

      {!u.password_set ? (
        <Alert className="border-primary/30 bg-primary/5">
          <AlertTitle className="text-primary">Set password Anda</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              Akun Anda belum punya password. Set password sekarang untuk mengaktifkan login dengan email.
            </span>
            <Button size="sm" onClick={() => router.push("/set-password")}>
              Set Password
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              Status Langganan
            </CardTitle>
            <CardDescription>
              Detail paket langganan aktif saat ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Paket Aktif:</span>
              <span className="text-sm font-bold text-foreground bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                {t.current_plan?.name ?? "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status Pembayaran:</span>
              <Badge variant={t.status === "active" ? "default" : "secondary"} className="uppercase tracking-wide text-xs">
                {t.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-lg">Modul Aktif</CardTitle>
            <CardDescription>
              Atur modul yang aktif di halaman Modul.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="grid gap-3">
              {t.modules.map((m) => (
                <li
                  key={m.feature_code}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm bg-muted/20"
                >
                  <span className={`font-medium ${m.plan_entitled ? "" : "text-muted-foreground"}`}>
                    {m.feature_code}
                  </span>
                  <Badge
                    variant={!m.plan_entitled ? "destructive" : m.enabled ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {!m.plan_entitled
                      ? "Tidak Termasuk"
                      : m.enabled
                        ? "Aktif"
                        : "Nonaktif"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
