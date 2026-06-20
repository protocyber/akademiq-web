"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Download,
  MailPlus,
  MoreHorizontal,
  Pencil,
  UserPlus,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmailVerifiedBadge } from "@/components/ui/email-verified-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { ApiHttpError } from "@/lib/api/types";
import { formatDate } from "@/lib/date-utils";
import { ErrorView } from "@/components/ui/error-view";
import {
  CREATE_USER_ALREADY_EXISTS_MESSAGE,
  getErrorMessage,
  isApiError,
  removeFromTenantConfirm,
  resetPasswordConfirm,
} from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useLogout } from "@/lib/query/mutations/use-logout";
import {
  exportTenantUsers,
  useAddTenantUserRole,
  useBulkAddTenantUserRole,
  useBulkDisableTenantUsers,
  useBulkEnableTenantUsers,
  useCreateTenantUser,
  useInviteTenantUser,
  useRemoveTenantUser,
  useRemoveTenantUserRole,
  useResetTenantUserPassword,
  useRevokeInvitation,
  useSetTenantUserEnabled,
  useUpdateTenantUser,
} from "@/lib/query/mutations/use-tenant-users";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { TenantRole, useAllTenantRoles } from "@/lib/query/queries/use-tenant-roles";
import {
  TenantInvitation,
  TenantUser,
  useTenantInvitations,
  useTenantUsers,
} from "@/lib/query/queries/use-tenant-users";
import {
  createTenantUserSchema,
  inviteTenantUserSchema,
  updateTenantUserSchema,
  type CreateTenantUserForm,
  type InviteTenantUserForm,
  type UpdateTenantUserForm,
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

function roleLabel(code: string, roles: TenantRole[]): string {
  return roleLabels[code] ?? roles.find((r) => r.code === code)?.name ?? code;
}

function roleOptions(roles: TenantRole[]) {
  return roles.map((role) => ({ value: role.code, label: roleLabel(role.code, roles) }));
}

export default function SettingsUsersPage() {
  return (
    <AuthGuard fallback={<UsersSkeleton />}>
      <UsersContent />
    </AuthGuard>
  );
}

function UsersSkeleton() {
  return (
    <main className="container mx-auto w-full space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-56" />
      <Card>
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
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
  const [selected, setSelected] = React.useState<RowSelectionState>({});
  const users = useTenantUsers(params);
  const roles = useAllTenantRoles();
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
        className="mx-auto w-full"
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

  const roleList = roles.data ?? [];
  const userList = users.data?.data ?? [];
  const meta = users.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 };
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

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
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Pengguna</CardTitle>
              <CardDescription>Kelola guru, wali kelas, kepala sekolah, siswa, dan orang tua di AcademiQ.</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <CreateUserDialog roles={roleList} />
              <InviteDialog roles={roleList} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <UsersTableSection
            users={userList}
            meta={meta}
            roles={roleList}
            params={params}
            searchDraft={searchDraft}
            rowSelection={selected}
            selectedIds={selectedIds}
            onSearchDraftChange={setSearchDraft}
            onRowSelectionChange={setSelected}
            onParamsChange={(next) => replaceUsersParams(router, next)}
          />
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg">Undangan</CardTitle>
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
    </SidebarLayout>
  );
}

function replaceUsersParams(router: ReturnType<typeof useRouter>, params: TenantUsersParams) {
  const query = serializeTenantUsersParams(params);
  router.replace(query ? `/settings/users?${query}` : "/settings/users", { scroll: false });
}

type Meta = { page: number; page_size: number; total: number; };

type UsersTableSectionProps = {
  users: TenantUser[];
  meta: Meta;
  roles: TenantRole[];
  params: TenantUsersParams;
  searchDraft: string;
  rowSelection: RowSelectionState;
  selectedIds: string[];
  onSearchDraftChange: (value: string) => void;
  onRowSelectionChange: (value: RowSelectionState) => void;
  onParamsChange: (params: TenantUsersParams) => void;
};

const SORT_FIELDS: Record<string, { asc: TenantUsersSort; desc: TenantUsersSort; }> = {
  name: { asc: "name", desc: "-name" },
  status: { asc: "status", desc: "-status" },
  role: { asc: "role", desc: "-role" },
};

function UsersTableSection(props: UsersTableSectionProps) {
  const {
    users,
    meta,
    roles,
    params,
    searchDraft,
    rowSelection,
    selectedIds,
    onSearchDraftChange,
    onRowSelectionChange,
    onParamsChange,
  } = props;
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const [editing, setEditing] = React.useState<TenantUser | null>(null);

  function toggleSort(field: keyof typeof SORT_FIELDS) {
    const { asc, desc } = SORT_FIELDS[field];
    const next = params.sort === asc ? desc : asc;
    onParamsChange({ ...params, sort: next, page: 1 });
  }

  function sortIcon(field: keyof typeof SORT_FIELDS) {
    const { asc, desc } = SORT_FIELDS[field];
    if (params.sort === asc) return <ArrowUp className="h-3.5 w-3.5" />;
    if (params.sort === desc) return <ArrowDown className="h-3.5 w-3.5" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
  }

  const allSelected = users.length > 0 && users.every((u) => rowSelection[u.user_id]);
  const someSelected = users.some((u) => rowSelection[u.user_id]);

  const columns: ColumnDef<TenantUser>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            users.forEach((u) => {
              if (checked) next[u.user_id] = true;
              else delete next[u.user_id];
            });
            onRowSelectionChange(next);
          }}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.user_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.user_id] = true;
            else delete next[row.original.user_id];
            onRowSelectionChange(next);
          }}
          aria-label={`Pilih ${row.original.full_name}`}
        />
      ),
    },
    {
      id: "name",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("name")}>
          Nama {sortIcon("name")}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{row.original.full_name}</p>
          <div className="truncate text-sm text-muted-foreground flex items-center gap-2">
            <span>{row.original.email ?? row.original.username}</span>
            {row.original.email && <EmailVerifiedBadge verified={row.original.email_verified} />}
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("status")}>
          Status {sortIcon("status")}
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "secondary" : "destructive"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "role",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("role")}>
          Role {sortIcon("role")}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex max-w-md flex-wrap gap-1">
          {row.original.roles.map((code) => (
            <Badge key={code} variant="secondary">
              {roleLabel(code, roles)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      size: 64,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => setEditing(row.original)}
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_10rem_10rem_auto]">
        <Input
          value={searchDraft}
          onChange={(event) => onSearchDraftChange(event.target.value)}
          placeholder="Cari nama, email, username"
        />
        <Select
          value={params.role ?? "all"}
          onValueChange={(role) => onParamsChange({ ...params, role: role === "all" ? undefined : role, page: 1 })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua role</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.role_id} value={role.code}>
                {roleLabel(role.code, roles)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={params.status ?? "all"}
          onValueChange={(status) => onParamsChange({ ...params, status: status === "all" ? undefined : status, page: 1 })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="disabled">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => exportTenantUsers(params)}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      <BulkActionMenu
        selectedIds={selectedIds}
        roles={roles}
        onDone={() => onRowSelectionChange({})}
      />

      <DataTable
        columns={columns}
        data={users}
        getRowId={(row) => row.user_id}
        rowSelection={rowSelection}
        emptyText="Tidak ada pengguna yang cocok."
      />

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Halaman {meta.page} dari {pageCount} · {meta.total} pengguna
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => onParamsChange({ ...params, page: meta.page - 1 })}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.page >= pageCount}
            onClick={() => onParamsChange({ ...params, page: meta.page + 1 })}
          >
            Berikutnya
          </Button>
        </div>
      </div>

      {editing ? (
        <EditUserDialog
          user={users.find((user) => user.user_id === editing.user_id) ?? editing}
          roles={roles}
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function BulkActionMenu({
  selectedIds,
  roles,
  onDone,
}: {
  selectedIds: string[];
  roles: TenantRole[];
  onDone: () => void;
}) {
  const enable = useBulkEnableTenantUsers();
  const disable = useBulkDisableTenantUsers();
  const addRole = useBulkAddTenantUserRole();

  async function runEnable() {
    await runBulk(() => enable.mutateAsync({ user_ids: selectedIds }), onDone);
  }
  async function runDisable() {
    await runBulk(() => disable.mutateAsync({ user_ids: selectedIds }), onDone);
  }
  async function runAddRole(roleId: string) {
    await runBulk(() => addRole.mutateAsync({ user_ids: selectedIds, role_id: roleId }), onDone);
  }

  if (selectedIds.length === 0) return null;

  const pending = enable.isPending || disable.isPending || addRole.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <span>{selectedIds.length} dipilih</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" loading={pending} className="gap-1">
            Aksi massal <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Aksi untuk {selectedIds.length} pengguna</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={runEnable}>Aktifkan</DropdownMenuItem>
          <DropdownMenuItem onClick={runDisable}>Nonaktifkan</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Tambah role</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {roles.map((role) => (
                <DropdownMenuItem key={role.role_id} onClick={() => runAddRole(role.role_id)}>
                  {roleLabel(role.code, roles)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type BulkResult = { user_id: string; success: boolean; reason: string | null; };

async function runBulk(action: () => Promise<BulkResult[]>, onDone: () => void) {
  try {
    const result = await action();
    const failed = result.filter((item) => !item.success);
    toast.success(`${result.length - failed.length} berhasil, ${failed.length} gagal.`);
    if (failed.length) {
      toast.error(failed.map((item) => item.reason).filter(Boolean).join("; "));
    }
    onDone();
  } catch (err) {
    toast.error(getErrorMessage(err, { fallback: "Aksi massal gagal." }));
  }
}

function CreateUserDialog({ roles }: { roles: TenantRole[]; }) {
  const [open, setOpen] = React.useState(false);
  const create = useCreateTenantUser();
  const form = useForm<CreateTenantUserForm>({
    resolver: zodResolver(createTenantUserSchema),
    defaultValues: { username: "", full_name: "", roles: [], email: "", password: "" },
  });

  async function onSubmit(values: CreateTenantUserForm) {
    try {
      await create.mutateAsync(values);
      toast.success("Pengguna dibuat.");
      form.reset({ username: "", full_name: "", roles: [], email: "", password: "" });
      setOpen(false);
    } catch (err) {
      // Create-time "already exists" steers the admin to invitations.
      if (isApiError(err, "USERNAME_TAKEN") || isApiError(err, "EMAIL_ALREADY_EXISTS")) {
        const field = isApiError(err, "EMAIL_ALREADY_EXISTS") ? "email" : "username";
        form.setError(field, { type: "server", message: CREATE_USER_ALREADY_EXISTS_MESSAGE });
        return;
      }
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa membuat pengguna." }));
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Tambah Pengguna
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah pengguna baru</DialogTitle>
          <DialogDescription>
            Buat akun baru dengan username pilihan. Untuk menambahkan orang yang sudah punya akun, gunakan alur undangan.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="budi_guru" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama lengkap</FormLabel>
                  <FormControl>
                    <Input placeholder="Budi Santoso" {...field} />
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
                  <FormControl>
                    <MultiSelect
                      options={roleOptions(roles)}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pilih role"
                      aria-invalid={Boolean(form.formState.errors.roles)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (opsional)</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="budi@sekolah.sch.id" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password (opsional)</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="Kosongkan untuk akun pending" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" loading={create.isPending}>
                Buat Pengguna
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  roles,
  open,
  onOpenChange,
}: {
  user: TenantUser;
  roles: TenantRole[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateTenantUser(user.user_id);
  const addRole = useAddTenantUserRole(user.user_id);
  const removeRole = useRemoveTenantUserRole(user.user_id);
  const resetPassword = useResetTenantUserPassword();
  const enabled = user.status === "active";
  const setEnabled = useSetTenantUserEnabled(user.user_id, !enabled);
  const remove = useRemoveTenantUser(user.user_id);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);

  const form = useForm<UpdateTenantUserForm>({
    resolver: zodResolver(updateTenantUserSchema),
    defaultValues: {
      username: user.username,
      full_name: user.full_name,
      email: user.email ?? "",
    },
  });

  React.useEffect(() => {
    form.reset({ username: user.username, full_name: user.full_name, email: user.email ?? "" });
  }, [user, form]);

  async function onSubmitIdentity(values: UpdateTenantUserForm) {
    try {
      await update.mutateAsync(values);
      toast.success("Identitas pengguna diperbarui.");
    } catch (err) {
      if (isApiError(err, "USERNAME_TAKEN")) {
        form.setError("username", { type: "server", message: getErrorMessage(err) });
        return;
      }
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa memperbarui pengguna." }));
      }
    }
  }

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
    try {
      const result = await resetPassword.mutateAsync({ userId: user.user_id });
      toast.success(`Password sementara: ${result.temporary_password}`);
      setConfirmReset(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa reset password." }));
    }
  }

  async function onRemoveFromTenant() {
    try {
      await remove.mutateAsync();
      toast.success("Pengguna dikeluarkan dari tenant.");
      setConfirmRemove(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa mengeluarkan pengguna." }));
    }
  }

  const heldRoles = roles.filter((role) => user.roles.includes(role.code));
  const availableRoles = roles.filter((role) => !user.roles.includes(role.code));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit pengguna</DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1">
            <span>{user.email ?? user.username}</span>
          </DialogDescription>
          {user.email && (
            <div className="mt-1">
              <EmailVerifiedBadge verified={user.email_verified} />
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitIdentity)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama lengkap</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" loading={update.isPending} className="w-full">
              Simpan identitas
            </Button>
          </form>
        </Form>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Role</p>
          <div className="flex flex-wrap gap-1">
            {heldRoles.length ? (
              heldRoles.map((role) => (
                <Badge key={role.role_id} variant="secondary" className="gap-1">
                  {roleLabel(role.code, roles)}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 p-0"
                    loading={removeRole.isPending}
                    onClick={() => onRemoveRole(role)}
                    aria-label={`Hapus role ${role.code}`}
                  >
                    <span aria-hidden>×</span>
                  </Button>
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Belum ada role.</span>
            )}
          </div>
          {availableRoles.length ? (
            <Select onValueChange={onAddRole} disabled={addRole.isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Tambah role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.role_id} value={role.role_id}>
                    {roleLabel(role.code, roles)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              disabled={setEnabled.isPending}
              onCheckedChange={onToggleEnabled}
              aria-label={`Aktifkan ${user.email ?? user.username}`}
            />
            <span className="text-sm text-muted-foreground">{enabled ? "Aktif" : "Nonaktif"}</span>
          </div>
          <Button size="sm" variant="outline" loading={resetPassword.isPending} onClick={() => setConfirmReset(true)}>
            Reset password
          </Button>
        </div>

        <div className="border-t pt-4">
          <Button
            variant="destructive"
            className="w-full"
            loading={remove.isPending}
            onClick={() => setConfirmRemove(true)}
          >
            Keluarkan dari tenant
          </Button>
        </div>

        <ConfirmDialog
          open={confirmReset}
          onOpenChange={setConfirmReset}
          title="Reset password?"
          description={resetPasswordConfirm(user.full_name)}
          confirmLabel="Reset"
          loading={resetPassword.isPending}
          onConfirm={onResetPassword}
        />

        <ConfirmDialog
          open={confirmRemove}
          onOpenChange={setConfirmRemove}
          title="Keluarkan dari tenant?"
          description={removeFromTenantConfirm(user.full_name)}
          confirmLabel="Keluarkan"
          destructive
          loading={remove.isPending}
          onConfirm={onRemoveFromTenant}
        />
      </DialogContent>
    </Dialog>
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
        <Button variant="outline">
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
                  <FormControl>
                    <MultiSelect
                      options={roleOptions(roles)}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pilih role"
                      aria-invalid={Boolean(form.formState.errors.roles)}
                    />
                  </FormControl>
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

function InvitationCard({ invitation }: { invitation: TenantInvitation; }) {
  const revoke = useRevokeInvitation(invitation.invitation_id);
  const invitationRoles = invitation.roles?.length
    ? invitation.roles
    : invitation.role_code
      ? [invitation.role_code]
      : [];

  async function onRevoke() {
    try {
      await revoke.mutateAsync();
      toast.success("Undangan dibatalkan.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa membatalkan undangan." }));
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="break-all text-sm font-semibold text-foreground">{invitation.email}</p>
        <p className="text-xs text-muted-foreground">
          {invitationRoles.map((role) => roleLabels[role] ?? role).join(", ") || "Tanpa role"} · kedaluwarsa{" "}
          {formatDate(invitation.expires_at)}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled>Resend</Button>
        <Button size="sm" variant="destructive" loading={revoke.isPending} onClick={onRevoke}>Revoke</Button>
      </div>
    </div>
  );
}



