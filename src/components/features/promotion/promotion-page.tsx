"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useMe } from "@/lib/query/queries/use-me";
import { usePromotionAccess } from "@/lib/query/queries/use-promotion";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";

export type PromotionAccess = ReturnType<typeof usePromotionAccess>;

function PageSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <DataTableCard title={title} description={description}>
      <div className="space-y-2 px-4 pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </DataTableCard>
  );
}

export function PromotionPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (access: PromotionAccess) => React.ReactNode;
}) {
  return (
    <AuthGuard
      fallback={
        <SidebarLayout className="mx-auto w-full">
          <PageSkeleton title={title} description={description} />
        </SidebarLayout>
      }
    >
      <PromotionShell title={title} description={description}>
        {children}
      </PromotionShell>
    </AuthGuard>
  );
}

function PromotionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (access: PromotionAccess) => React.ReactNode;
}) {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  const access = usePromotionAccess();

  React.useEffect(() => {
    if (!access.isLoading && !access.canRead) router.replace("/dashboard");
  }, [access.isLoading, access.canRead, router]);

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
      {access.isLoading || !access.canRead ? (
        <PageSkeleton title={title} description={description} />
      ) : !access.moduleEnabled ? (
        <Alert>
          <AlertTitle>Modul belum aktif</AlertTitle>
          <AlertDescription>
            Kenaikan kelas memakai modul Operasional Akademik. Aktifkan modul atau cek paket langganan.
          </AlertDescription>
        </Alert>
      ) : (
        children(access)
      )}
    </SidebarLayout>
  );
}
