"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { MailPlus } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { ApiHttpError } from "@/lib/api/types";
import { ErrorView } from "@/components/ui/error-view";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useLogout } from "@/lib/query/mutations/use-logout";
import {
  useChangeTenantUserRole,
  useInviteTenantUser,
  useRevokeInvitation,
  useSetTenantUserEnabled,
} from "@/lib/query/mutations/use-tenant-users";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import {
  TenantInvitation,
  TenantUser,
  useTenantInvitations,
  useTenantUsers,
} from "@/lib/query/queries/use-tenant-users";
import {
  inviteTenantUserSchema,
  tenantAssignableRoles,
  type InviteTenantUserForm,
} from "@/lib/schemas/tenant-user-management";

const roleLabels: Record<string, string> = {
  teacher: "Guru Mapel",
  homeroom_teacher: "Wali Kelas",
  principal: "Kepala Sekolah",
  parent: "Orang Tua",
  student: "Siswa",
};

export default function SettingsUsersPage() {
  return (
    <AuthGuard fallback={<UsersSkeleton /> }>
      <UsersContent />
    </AuthGuard>
  );
}

function UsersSkeleton() {
  return (
    <main className="container mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function UsersContent() {
  const tenant = useTenantMe();
  const me = useMe();
  const users = useTenantUsers();
  const invitations = useTenantInvitations();
  const logout = useLogout();
  const router = useRouter();

  if (tenant.isLoading || me.isLoading || users.isLoading || invitations.isLoading) {
    return <UsersSkeleton />;
  }

  const layoutError = tenant.error || me.error;
  if (layoutError || !tenant.data || !me.data) {
    const status = layoutError instanceof ApiHttpError ? layoutError.status : undefined;
    return (
      <ErrorView
        status={status}
        fullPage
        onRetry={() => {
          tenant.refetch();
          me.refetch();
        }}
      />
    );
  }

  const dataError = users.error || invitations.error;
  if (dataError) {
    const status = dataError instanceof ApiHttpError ? dataError.status : undefined;
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
        className="mx-auto max-w-5xl"
      >
        <ErrorView
          status={status}
          onRetry={() => {
            users.refetch();
            invitations.refetch();
          }}
        />
      </SidebarLayout>
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
      className="mx-auto max-w-5xl"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Pengguna Tenant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Undang guru, wali kelas, kepala sekolah, siswa, dan orang tua untuk masuk ke AcademiQ.
          </p>
        </div>
        <InviteDialog />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card className="border border-border shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">Akun Aktif</CardTitle>
            <CardDescription>Perubahan role berlaku saat pengguna refresh token berikutnya.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {users.data?.length ? (
              <div className="divide-y rounded-lg border">
                {users.data.map((user) => (
                  <TenantUserRow key={user.user_id} user={user} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Belum ada akun tenant selain admin.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">Undangan Pending</CardTitle>
            <CardDescription>Token hanya tampil saat undangan dibuat; gunakan revoke untuk membatalkan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {invitations.data?.filter((i) => i.status === "pending").length ? (
              invitations.data
                .filter((i) => i.status === "pending")
                .map((invitation) => (
                  <InvitationCard key={invitation.invitation_id} invitation={invitation} />
                ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Tidak ada undangan pending.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}

function InviteDialog() {
  const [open, setOpen] = React.useState(false);
  const [activationLink, setActivationLink] = React.useState<string | null>(null);
  const invite = useInviteTenantUser();
  const form = useForm<InviteTenantUserForm>({
    resolver: zodResolver(inviteTenantUserSchema),
    defaultValues: { email: "", role: "teacher" },
  });

  async function onSubmit(values: InviteTenantUserForm) {
    setActivationLink(null);
    try {
      const result = await invite.mutateAsync(values);
      setActivationLink(result.activation_link);
      form.reset({ email: "", role: values.role });
      toast.success("Undangan dibuat.");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa membuat undangan." }));
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MailPlus className="h-4 w-4" />
          Undang Pengguna
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Undang pengguna tenant</DialogTitle>
          <DialogDescription>Bagikan link aktivasi secara manual sampai layanan notifikasi tersedia.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="guru@sekolah.sch.id" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenantAssignableRoles.map((role) => (
                        <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {activationLink ? (
              <Alert>
                <AlertTitle>Link aktivasi</AlertTitle>
                <AlertDescription className="break-all text-xs">{activationLink}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="submit" loading={invite.isPending}>Buat Undangan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TenantUserRow({ user }: { user: TenantUser }) {
  const changeRole = useChangeTenantUserRole(user.user_id);
  const setEnabled = useSetTenantUserEnabled(user.user_id, user.status !== "active");
  const enabled = user.status === "active";

  async function onRoleChange(role: string) {
    try {
      await changeRole.mutateAsync({ role: role as never });
      toast.success("Role pengguna diperbarui.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa mengubah role." }));
    }
  }

  async function onToggleEnabled() {
    try {
      await setEnabled.mutateAsync();
      toast.success(enabled ? "Akun dinonaktifkan." : "Akun diaktifkan.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa mengubah status akun." }));
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-foreground">{user.full_name}</h3>
          <Badge variant={enabled ? "secondary" : "destructive"}>{user.status}</Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground">{user.email ?? user.username}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={user.role_code} onValueChange={onRoleChange} disabled={changeRole.isPending}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tenantAssignableRoles.map((role) => (
              <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} disabled={setEnabled.isPending} onCheckedChange={onToggleEnabled} aria-label={`Aktifkan ${user.email ?? user.username}`} />
          <span className="text-xs text-muted-foreground">{enabled ? "Aktif" : "Nonaktif"}</span>
        </div>
      </div>
    </div>
  );
}

function InvitationCard({ invitation }: { invitation: TenantInvitation }) {
  const revoke = useRevokeInvitation(invitation.invitation_id);

  async function onRevoke() {
    try {
      await revoke.mutateAsync();
      toast.success("Undangan dibatalkan.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa membatalkan undangan." }));
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="space-y-1">
        <p className="break-all text-sm font-semibold text-foreground">{invitation.email}</p>
        <p className="text-xs text-muted-foreground">
          {roleLabels[invitation.role_code] ?? invitation.role_code} · kedaluwarsa {new Date(invitation.expires_at).toLocaleDateString("id-ID")}
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="outline" disabled>Resend</Button>
        <Button size="sm" variant="destructive" loading={revoke.isPending} onClick={onRevoke}>Revoke</Button>
      </div>
    </div>
  );
}
