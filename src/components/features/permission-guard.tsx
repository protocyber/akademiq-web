"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useTenantPermissions } from "@/lib/query/queries/use-tenant-roles";

export function PermissionGuard({
  children,
  fallback = null,
  permission,
  redirectTo = "/dashboard",
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  permission: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const permissions = useTenantPermissions();
  const hasPermission = React.useMemo(
    () => Boolean(permissions.data?.some((item) => item.code === permission && item.held)),
    [permission, permissions.data],
  );

  React.useEffect(() => {
    if (permissions.isLoading) return;
    if (!hasPermission) router.replace(redirectTo);
  }, [hasPermission, permissions.isLoading, redirectTo, router]);

  if (permissions.isLoading || !hasPermission) return <>{fallback}</>;
  return <>{children}</>;
}
