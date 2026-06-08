"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthGuard } from "@/components/features/auth-guard";
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
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.school_name}</h1>
          <p className="text-muted-foreground">
            {u.full_name} · {u.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/settings/modules">Modul</Link>
          </Button>
          <Button
            variant="ghost"
            loading={logout.isPending}
            onClick={async () => {
              await logout.mutateAsync();
              router.push("/login");
            }}
          >
            Keluar
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Langganan</CardTitle>
          <CardDescription>
            Status: <span className="font-medium">{t.status}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Plan saat ini:{" "}
            <span className="font-medium text-foreground">
              {t.current_plan?.name ?? "—"}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modul aktif</CardTitle>
          <CardDescription>
            Atur modul yang aktif di halaman Modul.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {t.modules.map((m) => (
              <li
                key={m.feature_code}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className={m.plan_entitled ? "" : "text-muted-foreground"}>
                  {m.feature_code}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {!m.plan_entitled
                    ? "tidak termasuk"
                    : m.enabled
                      ? "aktif"
                      : "nonaktif"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
