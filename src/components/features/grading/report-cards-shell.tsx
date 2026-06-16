"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";

/**
 * Shared sidebar shell for the nested report-card routes. Keeps the chrome
 * (auth guard, sidebar, error/loading states) consistent across the report-type
 * list, classroom picker, and per-class board.
 */
export function ReportCardsShell({
  title,
  description,
  children,
  skeleton,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  return (
    <AuthGuard fallback={skeleton ?? <DefaultSkeleton />}>
      <ReportCardsShellInner title={title} description={description} skeleton={skeleton}>
        {children}
      </ReportCardsShellInner>
    </AuthGuard>
  );
}

function ReportCardsShellInner({
  title,
  description,
  children,
  skeleton,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  if (tenant.isLoading || me.isLoading) return skeleton ?? <DefaultSkeleton />;
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
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </SidebarLayout>
  );
}

function DefaultSkeleton() {
  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}
