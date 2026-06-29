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
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  MailPlus,
  MoreHorizontal,
  Pencil,
  UserPlus,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { EmailVerifiedBadge } from "@/components/ui/email-verified-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { DataTableCard } from "@/components/ui/data-table-card";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormLabelRequired, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Combobox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  tenantUsersParamsKey,
  type TenantUsersParams,
  type TenantUsersSort,
} from "@/lib/schemas/tenant-users-params";
import { useSelectWithinPage } from "@/lib/data-table/use-select-within-page";

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
    <AuthGuard fallback={
      <SidebarLayout className="mx-auto w-full space-y-4">
        <DataTableCard
          title="Pengguna"
          description="Kelola guru, wali kelas, kepala sekolah, siswa, dan orang tua di AkademiQ."
        >
          <div className="space-y-3 px-4 pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </DataTableCard>
      </SidebarLayout>
    }>
      <UsersContent />
    </AuthGuard>
  );
}

function UsersContent() {
  const tenant = useTenantMe();
  const me = useMe();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseTenantUsersParams(searchParams), [searchParams]);
  const [selected, setSelected] = React.useState<RowSelectionState>({});
  const users = useTenantUsers(params);
  const roles = useAllTenantRoles();
  const invitations = useTenantInvitations();
  const logout = useLogout();

  const isLoading = tenant.isLoading || me.isLoading || users.isLoading || roles.isLoading || invitations.isLoading;

  const pageRows = users.data?.data ?? [];
  const selectWithinPage = useSelectWithinPage({
    rows: pageRows,
    rowSelection: selected,
    getRowId: (u) => u.user_id,
    onRowSelectionChange: setSelected,
    toggleMode: "some",
  });

  const paramsKey = tenantUsersParamsKey(params).join("\u0000");
  React.useEffect(() => {
    setSelected({});
  }, [paramsKey]);

  if (tenant.error || me.error) {
    const layoutError = tenant.error || me.error;
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

  if (users.error || roles.error || invitations.error) {
    const dataError = users.error || roles.error || invitations.error;
    const status = dataError instanceof ApiHttpError ? dataError.status : undefined;
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

  function applyParams(next: TenantUsersParams) {
    replaceUsersParams(router, next);
  }

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));

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
      className="mx-auto w-full space-y-4"
    >
      <DataTableCard
        title="Pengguna"
        description="Kelola guru, wali kelas, kepala sekolah, siswa, dan orang tua di AkademiQ."
        primaryActions={
          !isLoading ? (
            <>
              <CreateUserDialog roles={roleList} />
              <InviteDialog roles={roleList} />
            </>
          ) : null
        }
        toolbar={{
          selectAll: {
            checked: selectWithinPage.checked,
            disabled: selectWithinPage.disabled || isLoading,
            onToggle: () => selectWithinPage.toggleAll(),
          },
          bulkActions: !isLoading && selectedIds.length > 0 ? (
            <BulkActionMenu
              selectedIds={selectedIds}
              roles={roleList}
              onDone={() => setSelected({})}
            />
          ) : undefined,
          search: (
            <SearchInput
              value={params.search ?? ""}
              onChange={(val) => applyParams({ ...params, search: val || undefined, page: 1 })}
              debounce={350}
              placeholder="Cari nama, email, username"
              className="min-w-[160px] sm:flex-1 lg:flex-1"
              disabled={isLoading}
            />
          ),
          filters: !isLoading ? (
            <>
              <Select
                value={params.role ?? "all"}
                onValueChange={(role) => applyParams({ ...params, role: role === "all" ? undefined : role, page: 1 })}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua role</SelectItem>
                  {roleList.map((role) => (
                    <SelectItem key={role.role_id} value={role.code}>
                      {roleLabel(role.code, roleList)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={params.status ?? "all"}
                onValueChange={(status) => applyParams({ ...params, status: status === "all" ? undefined : status, page: 1 })}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
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
            </>
          ) : undefined,
        }}
        pagination={{
          page: meta.page,
          pageCount,
          total: meta.total,
          label: "pengguna",
          onPrev: () => applyParams({ ...params, page: meta.page - 1 }),
          onNext: () => applyParams({ ...params, page: meta.page + 1 }),
          disabled: isLoading,
        }}
      >
        {isLoading ? (
          <div className="space-y-3 px-4 pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <UsersTableSection
            users={userList}
            roles={roleList}
            params={params}
            rowSelection={selected}
            onRowSelectionChange={setSelected}
            onParamsChange={(next) => replaceUsersParams(router, next)}
          />
        )}
      </DataTableCard>

      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg">Undangan</CardTitle>
          <CardDescription>Token hanya tampil saat undangan dibuat; gunakan revoke untuk membatalkan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : invitations.data?.filter((i) => i.status === "pending").length ? (
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

type UsersTableSectionProps = {
  users: TenantUser[];
  roles: TenantRole[];
  params: TenantUsersParams;
  rowSelection: RowSelectionState;
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
    roles,
    params,
    rowSelection,
    onRowSelectionChange,
    onParamsChange,
  } = props;
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

  const columns: ColumnDef<TenantUser>[] = [
    {
      id: "select",
      size: 40,
      header: () => null,
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
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="Edit"
          onClick={() => setEditing(row.original)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        data={users}
        getRowId={(row) => row.user_id}
        rowSelection={rowSelection}
        emptyText="Tidak ada pengguna yang cocok."
        classNames={{ wrapper: "rounded-none !border-x-0" }}
      />

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
    <div className="flex flex-wrap items-center gap-2 text-sm">
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
  const [showPassword, setShowPassword] = React.useState(false);
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
      setShowPassword(false);
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
                  <FormLabelRequired>Username</FormLabelRequired>
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
                  <FormLabelRequired>Nama lengkap</FormLabelRequired>
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
                  <FormLabelRequired>Role</FormLabelRequired>
                  <FormControl>
                    <Combobox
                      multiple
                      searchable
                      items={roleOptions(roles)}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Pilih role"
                      aria-invalid={Boolean(form.formState.errors.roles)}
                      popoverModal
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
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Kosongkan untuk akun pending"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
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
  const [resetResult, setResetResult] = React.useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = React.useState(false);

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
      setConfirmReset(false);
      setResetResult(result.temporary_password);
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
                  <FormLabelRequired>Username</FormLabelRequired>
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
                  <FormLabelRequired>Nama lengkap</FormLabelRequired>
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

        <AlertDialog
          open={resetResult !== null}
          onOpenChange={(open) => {
            if (!open) setResetResult(null);
            setPasswordCopied(false);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Password berhasil direset</AlertDialogTitle>
              <AlertDialogDescription>
                Berikut password sementara untuk <span className="font-medium text-foreground">{user.full_name}</span>.
                Simpan password ini — hanya ditampilkan sekali.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-4 py-3">
              <code className="flex-1 break-all font-mono text-sm font-semibold">{resetResult}</code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={async () => {
                  if (!resetResult) return;
                  try {
                    await navigator.clipboard.writeText(resetResult);
                    toast.success("Password disalin.");
                    setPasswordCopied(true);
                    window.setTimeout(() => setPasswordCopied(false), 2000);
                  } catch {
                    toast.error("Tidak bisa menyalin password.");
                  }
                }}
              >
                {passwordCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Salin
                  </>
                )}
              </Button>
            </div>
            <div className="flex justify-end">
              <AlertDialogAction onClick={() => setResetResult(null)}>Tutup</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({ roles }: { roles: TenantRole[]; }) {
  const [open, setOpen] = React.useState(false);
  const [activationLink, setActivationLink] = React.useState<string | null>(null);
  const [linkCopied, setLinkCopied] = React.useState(false);
  const invite = useInviteTenantUser();
  const form = useForm<InviteTenantUserForm>({
    resolver: zodResolver(inviteTenantUserSchema),
    defaultValues: { email: "", roles: [] },
  });

  async function onSubmit(values: InviteTenantUserForm) {
    setActivationLink(null);
    setLinkCopied(false);
    try {
      const result = await invite.mutateAsync(values);
      setActivationLink(result.activation_link);
      form.reset({ email: "", roles: [] });
      toast.success("Undangan dibuat.");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa membuat undangan." }));
      }
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setActivationLink(null);
            setLinkCopied(false);
          }
        }}
      >
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
                    <FormLabelRequired>Email</FormLabelRequired>
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
                    <FormLabelRequired>Role</FormLabelRequired>
                    <FormControl>
                      <Combobox
                        multiple
                        searchable
                        items={roleOptions(roles)}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Pilih role"
                        aria-invalid={Boolean(form.formState.errors.roles)}
                        popoverModal
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" loading={invite.isPending}>Buat Undangan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={activationLink !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivationLink(null);
            setLinkCopied(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Link aktivasi dibuat</AlertDialogTitle>
            <AlertDialogDescription>
              Bagikan link berikut ke pengguna yang diundang. Simpan sekarang — link ini hanya ditampilkan sekali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted px-4 py-3">
            <code className="flex-1 break-all font-mono text-sm font-semibold">{activationLink}</code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={async () => {
                if (!activationLink) return;
                try {
                  await navigator.clipboard.writeText(activationLink);
                  toast.success("Link disalin.");
                  setLinkCopied(true);
                  window.setTimeout(() => setLinkCopied(false), 2000);
                } catch {
                  toast.error("Tidak bisa menyalin link.");
                }
              }}
            >
              {linkCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Salin Link
                </>
              )}
            </Button>
          </div>
          <div className="flex justify-end">
            <AlertDialogAction onClick={() => setActivationLink(null)}>Tutup</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
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



