"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useMe } from "@/lib/query/queries/use-me";
import { useToggleModule } from "@/lib/query/mutations/use-toggle-module";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { ApiHttpError } from "@/lib/api/types";

export default function ModulesPage() {
  return (
    <AuthGuard fallback={<ModulesSkeleton />}>
      <ModulesContent />
    </AuthGuard>
  );
}

function ModulesSkeleton() {
  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-40" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

function ModulesContent() {
  const tenant = useTenantMe();
  const me = useMe();
  const toggle = useToggleModule();
  const logout = useLogout();
  const router = useRouter();

  if (tenant.isLoading || me.isLoading) {
    return <ModulesSkeleton />;
  }

  if (tenant.error || me.error || !tenant.data || !me.data) {
    return (
      <main className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat modul</AlertTitle>
          <AlertDescription className="space-y-3">
            <Button
              size="sm"
              variant="outline"
              loading={tenant.isFetching || me.isFetching}
              onClick={() => {
                tenant.refetch();
                me.refetch();
              }}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const data = tenant.data;
  const u = me.data;
  const inFlight = toggle.variables?.feature_code;

  async function onToggle(feature_code: string, enabled: boolean) {
    try {
      await toggle.mutateAsync({ feature_code, enabled });
    } catch (err) {
      const message =
        err instanceof ApiHttpError
          ? err.message
          : "Tidak bisa mengubah modul.";
      toast.error(message);
    }
  }

  return (
    <SidebarLayout
      schoolName={data.school_name}
      userName={u.full_name}
      userEmail={u.email}
      isLoggingOut={logout.isPending}
      onLogout={async () => {
        await logout.mutateAsync();
        router.push("/login");
      }}
      className="max-w-3xl mx-auto"
    >
      <div>
        <h1 className="text-3xl font-extrabold font-display tracking-tight text-foreground">Modul Aktif</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Plan saat ini: <span className="font-semibold text-foreground">{data.current_plan?.name ?? "—"}</span>
        </p>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg">Konfigurasi Fitur</CardTitle>
          <CardDescription>
            Aktifkan modul yang termasuk dalam plan Anda. Modul yang tidak
            termasuk butuh upgrade plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ul className="divide-y">
            {data.modules.map((m) => {
              const pending = inFlight === m.feature_code && toggle.isPending;
              const disabled = !m.plan_entitled || pending;
              const switchEl = (
                <Switch
                  checked={m.enabled && m.plan_entitled}
                  disabled={disabled}
                  onCheckedChange={(checked) => onToggle(m.feature_code, checked)}
                  aria-label={`Toggle ${m.feature_code}`}
                />
              );
              return (
                <li
                  key={m.feature_code}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="flex flex-col">
                    <span className={m.plan_entitled ? "font-semibold text-foreground text-sm" : "font-medium text-muted-foreground text-sm"}>
                      {m.feature_code}
                    </span>
                    {!m.plan_entitled ? (
                      <span className="text-xs text-muted-foreground mt-0.5">
                        Tidak termasuk dalam plan ini
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    {pending ? <Spinner size="sm" /> : null}
                    {m.plan_entitled ? (
                      switchEl
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0}>{switchEl}</span>
                        </TooltipTrigger>
                        <TooltipContent>Upgrade plan untuk mengaktifkan</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </SidebarLayout>
  );
}
