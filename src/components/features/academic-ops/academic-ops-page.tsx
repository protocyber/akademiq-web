"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { PermissionGuard } from "@/components/features/permission-guard";

const opsNav = [
  { href: "/students", label: "Siswa" },
  { href: "/teachers", label: "Guru" },
  { href: "/homerooms", label: "Kelas" },
  { href: "/teaching-assignments", label: "Penugasan" },
];

export type OpsContext = { canManage: boolean; upgradeMessage: string; };

export function AcademicOpsPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (ctx: OpsContext) => React.ReactNode;
}) {
  return (
    <AuthGuard fallback={
      <SidebarLayout className="mx-auto w-full">
        <div className="space-y-4 px-6">
          <Tabs value="" activationMode="manual" variant="underline">
            <TabsList scrollable>
              {opsNav.map((item) => (
                <TabsTrigger key={item.href} value={item.href} asChild>
                  <Link href={item.href}>{item.label}</Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <DataTableCard title={title} description={description} className="pt-2">
          <div className="px-4 pb-4"><TableSkeleton /></div>
        </DataTableCard>
      </SidebarLayout>
    }>
      <OpsShell title={title} description={description}>
        {children}
      </OpsShell>
    </AuthGuard>
  );
}

function OpsShell({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: (ctx: OpsContext) => React.ReactNode;
}) {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = tenant.isLoading || me.isLoading;

  if (tenant.error || me.error) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat operasional akademik</AlertTitle>
          <AlertDescription>Coba muat ulang halaman.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const opsModule = tenant.data?.modules.find((item) => item.feature_code === "academic_ops");
  const canManage = Boolean(opsModule?.plan_entitled && opsModule.enabled);
  const upgradeMessage = opsModule?.plan_entitled
    ? "Aktifkan modul Academic Ops terlebih dahulu."
    : "Upgrade plan untuk mengelola operasional akademik.";

  return (
    <SidebarLayout
      schoolName={tenant.data?.school_name}
      userName={me.data?.full_name}
      userEmail={me.data?.email}
      isLoggingOut={logout.isPending}
      onLogout={async () => {
        await logout.mutateAsync();
        router.push("/login");
      }}
      className="mx-auto w-full"
    >
      <div className="space-y-4 px-6">
        <Tabs value={pathname} activationMode="manual" variant="underline">
          <TabsList scrollable>
            {opsNav.map((item) => (
              <TabsTrigger key={item.href} value={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {isLoading ? (
        <DataTableCard title={title ?? "Operasional Akademik"} description={description}>
          <div className="px-4 pb-4"><TableSkeleton /></div>
        </DataTableCard>
      ) : (
        <PermissionGuard
          permission="academic.ops.manage"
          fallback={
            <DataTableCard title={title ?? "Operasional Akademik"} description={description}>
              <div className="px-4 pb-4"><TableSkeleton /></div>
            </DataTableCard>
          }
        >
          <>
            {!canManage ? (
              <Alert>
                <AlertTitle>Kontrol dibatasi</AlertTitle>
                <AlertDescription>{upgradeMessage}</AlertDescription>
              </Alert>
            ) : null}
            {children({ canManage, upgradeMessage })}
          </>
        </PermissionGuard>
      )}
    </SidebarLayout>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number; }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** A submit/action button disabled (with an explanatory tooltip) when the
 * tenant cannot manage academic ops. */
export function GuardedButton({
  enabled,
  message,
  loading,
  children,
  onClick,
  type = "submit",
  variant = "default",
}: {
  enabled: boolean;
  message: string;
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "submit" | "button";
  variant?: "default" | "outline" | "destructive";
}) {
  const button = (
    <Button type={onClick ? "button" : type} variant={variant} disabled={!enabled} loading={loading} onClick={onClick}>
      {children}
    </Button>
  );
  if (enabled) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent>{message}</TooltipContent>
    </Tooltip>
  );
}
