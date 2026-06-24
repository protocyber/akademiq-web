"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Combobox } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/features/auth-guard";
import { PermissionGuard } from "@/components/features/permission-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import type { AcademicYear } from "@/lib/query/queries/use-academic-config";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";

const academicNav = [
  { href: "/settings/academic/years", label: "Tahun Ajaran" },
  { href: "/settings/academic/terms", label: "Semester" },
  { href: "/settings/academic/subjects", label: "Mata Pelajaran" },
  { href: "/settings/academic/class-templates", label: "Template Kelas" },
];

type AcademicSettingsContext = {
  canManageAcademicConfig: boolean;
  upgradeMessage: string;
};

export function AcademicSettingsPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (context: AcademicSettingsContext) => React.ReactNode;
}) {
  return (
    <AuthGuard fallback={<AcademicPageSkeleton />}>
      <PermissionGuard fallback={<AcademicPageSkeleton />} permission="academic.config.write">
        <AcademicSettingsContent title={title} description={description}>
          {children}
        </AcademicSettingsContent>
      </PermissionGuard>
    </AuthGuard>
  );
}

function AcademicSettingsContent({
  // title,
  // description,
  children,
}: {
  title?: string;
  description?: string;
  children: (context: AcademicSettingsContext) => React.ReactNode;
}) {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  if (tenant.isLoading || me.isLoading) {
    return <AcademicPageSkeleton />;
  }

  if (tenant.error || me.error || !tenant.data || !me.data) {
    return (
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat pengaturan akademik</AlertTitle>
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

  const academicModule = tenant.data.modules.find(
    (module) => module.feature_code === "academic_config",
  );
  const canManageAcademicConfig = Boolean(
    academicModule?.plan_entitled && academicModule.enabled,
  );
  const upgradeMessage = academicModule?.plan_entitled
    ? "Aktifkan modul Academic Config terlebih dahulu."
    : "Upgrade plan untuk mengubah konfigurasi akademik.";

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
      <div className="space-y-4 px-6">
        {/* <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div> */}
        <Tabs value={pathname} activationMode="manual" variant="underline">
          <TabsList scrollable>
            {academicNav.map((item) => (
              <TabsTrigger key={item.href} value={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {!canManageAcademicConfig ? (
        <Alert>
          <AlertTitle>Kontrol dibatasi</AlertTitle>
          <AlertDescription>{upgradeMessage}</AlertDescription>
        </Alert>
      ) : null}

      {children({ canManageAcademicConfig, upgradeMessage })}
    </SidebarLayout>
  );
}

export function AcademicPageSkeleton() {
  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-56" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

export function EntitlementTooltip({
  enabled,
  message,
  children,
}: {
  enabled: boolean;
  message: string;
  children: React.ReactElement;
}) {
  if (enabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" tabIndex={0}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{message}</TooltipContent>
    </Tooltip>
  );
}

export function YearPicker({
  years,
  isLoading,
  value,
  onChange,
  disabled,
}: {
  years: AcademicYear[];
  isLoading?: boolean;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Combobox
      items={years}
      isLoading={Boolean(isLoading)}
      value={value}
      onValueChange={onChange}
      getOptionValue={(year) => year.academic_year_id}
      getOptionLabel={(year) => `${year.name} (${year.status})`}
      placeholder="Pilih tahun ajaran"
      emptyText="Belum ada tahun ajaran"
      disabled={disabled}
    />
  );
}
