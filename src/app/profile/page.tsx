"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import {
  ProfileHeader,
  ProfileInfoForm,
  MembershipInfo,
  EmailSection,
  PasswordSection,
  AvatarUpload,
} from "@/components/features/profile";

export default function ProfilePage() {
  return (
    <AuthGuard fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileSkeleton() {
  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-40" />
      <div className="grid gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </main>
  );
}

function ProfileContent() {
  const router = useRouter();
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();

  if (tenant.isLoading || me.isLoading) {
    return <ProfileSkeleton />;
  }

  if (tenant.error || me.error || !tenant.data || !me.data) {
    return (
      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat profil</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Periksa koneksi dan coba lagi.</p>
            <div className="flex gap-2">
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

  const t = tenant.data;
  const u = me.data;

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
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Profil Saya</h1>

        <ProfileHeader user={u} />

        <AvatarUpload user={u} />

        <ProfileInfoForm user={u} />

        <EmailSection user={u} />

        {u.password_set && <PasswordSection />}

        <MembershipInfo user={u} />
      </div>
    </SidebarLayout>
  );
}
