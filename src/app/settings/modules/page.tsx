"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toaster";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useToggleModule } from "@/lib/query/mutations/use-toggle-module";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { ApiHttpError } from "@/lib/api/types";

export default function ModulesPage() {
  const tenant = useTenantMe();
  const toggle = useToggleModule();
  const logout = useLogout();
  const router = useRouter();

  if (tenant.isLoading) {
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

  if (tenant.error || !tenant.data) {
    return (
      <main className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat modul</AlertTitle>
          <AlertDescription>
            <Button
              size="sm"
              variant="outline"
              loading={tenant.isFetching}
              onClick={() => tenant.refetch()}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const data = tenant.data;
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
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modul</h1>
          <p className="text-muted-foreground">
            Plan: <span className="font-medium">{data.current_plan?.name ?? "—"}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
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
          <CardTitle>Modul aktif</CardTitle>
          <CardDescription>
            Aktifkan modul yang termasuk dalam plan Anda. Modul yang tidak
            termasuk butuh upgrade plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className={m.plan_entitled ? "font-medium" : "font-medium text-muted-foreground"}>
                      {m.feature_code}
                    </span>
                    {!m.plan_entitled ? (
                      <span className="text-xs text-muted-foreground">
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
    </main>
  );
}
