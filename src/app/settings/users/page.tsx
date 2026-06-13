"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Download, KeyRound, MailPlus, X } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
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
  exportTenantUsers,
  useAddTenantUserRole,
  useBulkChangeTenantUserRole,
  useBulkDisableTenantUsers,
  useBulkEnableTenantUsers,
  useInviteTenantUser,
  useRemoveTenantUserRole,
  useResetTenantUserPassword,
  useRevokeInvitation,
  useSetTenantUserEnabled,
} from "@/lib/query/mutations/use-tenant-users";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { TenantRole, useTenantRoles } from "@/lib/query/queries/use-tenant-roles";
import {
  TenantInvitation,
  TenantUser,
  useTenantInvitations,
  useTenantUsers,
} from "@/lib/query/queries/use-tenant-users";
import {
  inviteTenantUserSchema,
  type InviteTenantUserForm,
} from "@/lib/schemas/tenant-user-management";
import {
  parseTenantUsersParams,
  serializeTenantUsersParams,
  type TenantUsersParams,
  type TenantUsersSort,
} from "@/lib/schemas/tenant-users-params";

const roleLabels: Record<string, string> = {
  teacher: "Guru Mapel",
  homeroom_teacher: "Wali Kelas",
  principal: "Kepala Sekolah",
  parent: "Orang Tua",
  student: "Siswa",
};

export default function SettingsUsersPage() {
  return (
    <AuthGuard fallback={<UsersSkeleton />}>
      <UsersContent />
    </AuthGuard>
  );
}

function UsersSkeleton() {
  return (
    <main className="container mx-auto max-w-7xl space-y-6 px-4 py-10">
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseTenantUsersParams(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");
  const [selected, setSelected] = React.useState<string[]>([]);
  const users = useTenantUsers(params);
  const roles = useTenantRoles();
  const invitations = useTenantInvitations();
  const logout = useLogout();

  React.useEffect(() => {
    setSearchDraft(params.search ?? "");
  }, [params.search]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search ?? "") !== searchDraft) {
        replaceUsersParams(router, { ...params, search: searchDraft || undefined, page: 1 });
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [params, router, searchDraft]);

  if (tenant.isLoading || me.isLoading || users.isLoading || roles.isLoading || invitations.isLoading) {
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

  const dataError = users.error || roles.error || invitations.error;
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
        className="mx-auto max-w-7xl"
      >
        <ErrorView
          status={status}
          onRetry={() => {
            users.refetch();
            roles.refetch();
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
      className="mx-auto max-w-7xl"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Pengguna Tenant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Undang guru, wali kelas, kepala sekolah, siswa, dan orang tua untuk masuk ke AcademiQ.
          </p>
        </div>
        <InviteDialog roles={roles.data ?? []} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card className="border border-border shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg">Akun Aktif</CardTitle>
            <CardDescription>Perubahan role berlaku saat pengguna refresh token berikutnya.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <UsersTable
              users={users.data?.data ?? []}
              meta={users.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 }}
              roles={roles.data ?? []}
              params={params}
              searchDraft={searchDraft}
              selected={selected}
              onSearchDraftChange={setSearchDraft}
              onSelectedChange={setSelected}
              onParamsChange={(next) => replaceUsersParams(router, next)}
            />
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

function replaceUsersParams(router: ReturnType<typeof useRouter>, params: TenantUsersParams) {
  const query = serializeTenantUsersParams(params);
  router.replace(query ? `/settings/users?${query}` : "/settings/users", { scroll: false });
}

type UsersTableProps = {
  users: TenantUser[];
  meta: { page: number; page_size: number; total: number; };
  roles: TenantRole[];
  params: TenantUsersParams;
  searchDraft: string;
  selected: string[];
  onSearchDraftChange: (value: string) => void;
  onSelectedChange: (value: string[]) => void;
  onParamsChange: (params: TenantUsersParams) => void;
};

function UsersTable(props: UsersTableProps) {
  const { users, meta, roles, params, searchDraft, selected, onSearchDraftChange, onSelectedChange, onParamsChange } = props;
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const allSelected = users.length > 0 && users.every((user) => selected.includes(user.user_id));

  function setSort(sort: TenantUsersSort) {
    onParamsChange({ ...params, sort, page: 1 });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_10rem_10rem_auto]">
        <Input value={searchDraft} onChange={(event) => onSearchDraftChange(event.target.value)} placeholder="Cari nama, email, username" />
        <Select value={params.role ?? "all"} onValueChange={(role) => onParamsChange({ ...params, role: role === "all" ? undefined : role, page: 1 })}>
          <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua role</SelectItem>
            {roles.map((role) => <SelectItem key={role.role_id} value={role.code}>{roleLabels[role.code] ?? role.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={params.status ?? "all"} onValueChange={(status) => onParamsChange({ ...params, status: status === "all" ? undefined : status, page: 1 })}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="disabled">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => exportTenantUsers(params)}><Download className="h-4 w-4" /> Export</Button>
      </div>

      <BulkActionBar selected={selected} roles={roles} onDone={() => onSelectedChange([])} />

      {users.length ? (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[2.5rem_1.5fr_1fr_1fr_12rem] items-center gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground">
            <Checkbox checked={allSelected} onCheckedChange={(checked) => onSelectedChange(checked ? users.map((user) => user.user_id) : [])} aria-label="Pilih semua" />
            <Button variant="ghost" size="sm" onClick={() => setSort(params.sort === "name" ? "-name" : "name")}>Nama</Button>
            <Button variant="ghost" size="sm" onClick={() => setSort(params.sort === "status" ? "-status" : "status")}>Status</Button>
            <Button variant="ghost" size="sm" onClick={() => setSort(params.sort === "role" ? "-role" : "role")}>Role</Button>
            <span>Aksi</span>
          </div>
          <div className="divide-y">
            {users.map((user) => (
              <TenantUserRow
                key={user.user_id}
                user={user}
                roles={roles}
                selected={selected.includes(user.user_id)}
                onSelectedChange={(checked) => onSelectedChange(checked ? [...selected, user.user_id] : selected.filter((id) => id !== user.user_id))}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada pengguna yang cocok.</div>
      )}

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>Halaman {meta.page} dari {pageCount} · {meta.total} pengguna</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onParamsChange({ ...params, page: meta.page - 1 })}>Sebelumnya</Button>
          <Button variant="outline" size="sm" disabled={meta.page >= pageCount} onClick={() => onParamsChange({ ...params, page: meta.page + 1 })}>Berikutnya</Button>
        </div>
      </div>
    </div>
  );
}

function BulkActionBar({ selected, roles, onDone }: { selected: string[]; roles: TenantRole[]; onDone: () => void; }) {
  const enable = useBulkEnableTenantUsers();
  const disable = useBulkDisableTenantUsers();
  const changeRole = useBulkChangeTenantUserRole();

  async function run(action: "enable" | "disable" | "role", role?: string) {
    try {
      const result = action === "enable"
        ? await enable.mutateAsync({ user_ids: selected })
        : action === "disable"
          ? await disable.mutateAsync({ user_ids: selected })
          : await changeRole.mutateAsync({ user_ids: selected, role: role ?? "" });
      const failed = result.filter((item) => !item.success);
      toast.success(`${result.length - failed.length} berhasil, ${failed.length} gagal.`);
      if (failed.length) toast.error(failed.map((item) => item.reason).filter(Boolean).join("; "));
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Bulk action gagal." }));
    }
  }

  if (selected.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <span>{selected.length} dipilih</span>
      <Button size="sm" variant="outline" loading={enable.isPending} onClick={() => run("enable")}>Enable</Button>
      <Button size="sm" variant="outline" loading={disable.isPending} onClick={() => run("disable")}>Disable</Button>
      <Select onValueChange={(role) => run("role", role)} disabled={changeRole.isPending}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Ubah role" /></SelectTrigger>
        <SelectContent>{roles.map((role) => <SelectItem key={role.role_id} value={role.code}>{roleLabels[role.code] ?? role.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function InviteDialog({ roles }: { roles: TenantRole[]; }) {
  const [open, setOpen] = React.useState(false);
  const [activationLink, setActivationLink] = React.useState<string | null>(null);
  const invite = useInviteTenantUser();
  const form = useForm<InviteTenantUserForm>({
    resolver: zodResolver(inviteTenantUserSchema),
    defaultValues: { email: "", roles: [roles[0]?.code ?? "teacher"] },
  });

  async function onSubmit(values: InviteTenantUserForm) {
    setActivationLink(null);
    try {
      const result = await invite.mutateAsync(values);
      setActivationLink(result.activation_link);
      form.reset({ email: "", roles: values.roles });
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
              name="roles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {roles.map((role) => {
                      const checked = field.value.includes(role.code);
                      return (
                        <label key={role.role_id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              const value = next
                                ? [...field.value, role.code]
                                : field.value.filter((code) => code !== role.code);
                              field.onChange(value);
                            }}
                          />
                          <span>{roleLabels[role.code] ?? role.name}</span>
                        </label>
                      );
                    })}
                  </div>
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

function TenantUserRow({
  user,
  roles,
  selected,
  onSelectedChange,
}: {
  user: TenantUser;
  roles: TenantRole[];
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
}) {
  const addRole = useAddTenantUserRole(user.user_id);
  const removeRole = useRemoveTenantUserRole(user.user_id);
  const resetPassword = useResetTenantUserPassword();
  const setEnabled = useSetTenantUserEnabled(user.user_id, user.status !== "active");
  const enabled = user.status === "active";

  async function onAddRole(roleId: string) {
    try {
      await addRole.mutateAsync({ roleId });
      toast.success("Role ditambahkan.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menambahkan role." }));
    }
  }

  async function onRemoveRole(role: TenantRole) {
    try {
      await removeRole.mutateAsync({ roleId: role.role_id });
      toast.success("Role dihapus dari pengguna.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus role pengguna." }));
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

  async function onResetPassword() {
    if (!window.confirm(`Reset password untuk ${user.full_name}?`)) return;
    try {
      const result = await resetPassword.mutateAsync({ userId: user.user_id });
      toast.success(`Password sementara: ${result.temporary_password}`);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa reset password." }));
    }
  }

  return (
    <div className="grid grid-cols-[2.5rem_1.5fr_1fr_1fr_12rem] items-center gap-3 p-4">
      <Checkbox checked={selected} onCheckedChange={(checked) => onSelectedChange(Boolean(checked))} aria-label={`Pilih ${user.full_name}`} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-foreground">{user.full_name}</h3>
          <Badge variant={enabled ? "secondary" : "destructive"}>{user.status}</Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground">{user.email ?? user.username}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex max-w-md flex-wrap gap-2">
          {user.roles.map((code) => {
            const role = roles.find((candidate) => candidate.code === code);
            return (
              <Badge key={code} variant="secondary" className="gap-1">
                {roleLabels[code] ?? role?.name ?? code}
                {role ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 p-0"
                    loading={removeRole.isPending}
                    onClick={() => onRemoveRole(role)}
                    aria-label={`Hapus role ${code}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                ) : null}
              </Badge>
            );
          })}
        </div>
        <Select onValueChange={onAddRole} disabled={addRole.isPending}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tambah role" />
          </SelectTrigger>
          <SelectContent>
            {roles.filter((role) => !user.roles.includes(role.code)).map((role) => (
              <SelectItem key={role.role_id} value={role.role_id}>{roleLabels[role.code] ?? role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} disabled={setEnabled.isPending} onCheckedChange={onToggleEnabled} aria-label={`Aktifkan ${user.email ?? user.username}`} />
          <span className="text-xs text-muted-foreground">{enabled ? "Aktif" : "Nonaktif"}</span>
        </div>
        <Button size="sm" variant="outline" loading={resetPassword.isPending} onClick={onResetPassword}>
          <KeyRound className="h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
}

function InvitationCard({ invitation }: { invitation: TenantInvitation; }) {
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
          {invitation.roles.map((role) => roleLabels[role] ?? role).join(", ")} · kedaluwarsa {new Date(invitation.expires_at).toLocaleDateString("id-ID")}
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="outline" disabled>Resend</Button>
        <Button size="sm" variant="destructive" loading={revoke.isPending} onClick={onRevoke}>Revoke</Button>
      </div>
    </div>
  );
}
