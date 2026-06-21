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
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { ErrorView } from "@/components/ui/error-view";
import { ApiHttpError } from "@/lib/api/types";
import { hasAccessPerm } from "@/lib/auth/access-claims";
import {
  BULK_DELETE_BUILTIN_BLOCKED,
  bulkDeleteRolesConfirm,
  getErrorMessage,
} from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useBulkDeleteTenantRoles, useCreateTenantRole, useUpdateTenantRole } from "@/lib/query/mutations/use-tenant-roles";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { Permission, TenantRole, useTenantPermissions, useTenantRoles } from "@/lib/query/queries/use-tenant-roles";
import { createTenantRoleSchema, type CreateTenantRoleForm } from "@/lib/schemas/tenant-role-management";
import {
  parseTenantRolesParams,
  serializeTenantRolesParams,
  type TenantRolesParams,
  type TenantRolesSort,
} from "@/lib/schemas/tenant-roles-params";

export default function SettingsRolesPage() {
  return (
    <AuthGuard fallback={<RolesSkeleton />}>
      <RolesContent />
    </AuthGuard>
  );
}

function RolesSkeleton() {
  return (
    <main className="container mx-auto max-w-5xl space-y-6 px-4 py-10">
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

function RolesContent() {
  const tenant = useTenantMe();
  const me = useMe();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseTenantRolesParams(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");
  const roles = useTenantRoles(params);
  const permissions = useTenantPermissions();
  const logout = useLogout();
  const canManageRoles = hasAccessPerm("role.manage");

  React.useEffect(() => {
    setSearchDraft(params.search ?? "");
  }, [params.search]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search ?? "") !== searchDraft) {
        replaceRolesParams(router, { ...params, search: searchDraft || undefined, page: 1 });
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [params, router, searchDraft]);

  if (tenant.isLoading || me.isLoading || roles.isLoading || permissions.isLoading) {
    return <RolesSkeleton />;
  }

  const error = tenant.error || me.error || roles.error || permissions.error;
  if (error || !tenant.data || !me.data) {
    const status = error instanceof ApiHttpError ? error.status : undefined;
    return <ErrorView status={status} fullPage onRetry={() => window.location.reload()} />;
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
      className="mx-auto w-full"
    >

      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Daftar Role</CardTitle>
              <CardDescription>Kelola role bawaan dan role custom sekolah dari palet izin yang Anda miliki.</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Cari nama atau kode role"
              />
              <RoleDialog permissions={permissions.data ?? []} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {!canManageRoles ? (
            <Alert variant="destructive">
              <AlertTitle>Akses dibatasi</AlertTitle>
              <AlertDescription>Anda belum memiliki izin role.manage untuk mengelola katalog role.</AlertDescription>
            </Alert>
          ) : null}
          <RolesTableSection
            roles={roles.data?.data ?? []}
            meta={roles.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 }}
            permissions={permissions.data ?? []}
            params={params}
            searchDraft={searchDraft}
            onSearchDraftChange={setSearchDraft}
            onParamsChange={(next) => replaceRolesParams(router, next)}
          />
        </CardContent>
      </Card>
    </SidebarLayout>
  );
}

function replaceRolesParams(router: ReturnType<typeof useRouter>, params: TenantRolesParams) {
  const query = serializeTenantRolesParams(params);
  router.replace(query ? `/settings/roles?${query}` : "/settings/roles", { scroll: false });
}

type Meta = { page: number; page_size: number; total: number; };

type RolesTableSectionProps = {
  roles: TenantRole[];
  meta: Meta;
  permissions: Permission[];
  params: TenantRolesParams;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onParamsChange: (params: TenantRolesParams) => void;
};

const SORT_FIELDS: Record<string, { asc: TenantRolesSort; desc: TenantRolesSort; }> = {
  name: { asc: "name", desc: "-name" },
  type: { asc: "type", desc: "-type" },
  users: { asc: "users", desc: "-users" },
};

function RolesTableSection(props: RolesTableSectionProps) {
  const {
    roles,
    meta,
    permissions,
    params,
    onParamsChange,
  } = props;
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [editing, setEditing] = React.useState<TenantRole | null>(null);
  const [cloning, setCloning] = React.useState<TenantRole | null>(null);
  const [viewing, setViewing] = React.useState<TenantRole | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Clear selection when the page / data changes to avoid stale selections.
  React.useEffect(() => {
    setRowSelection({});
  }, [params.page, params.search, params.sort]);

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

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const selectedRoles = roles.filter((r) => selectedIds.includes(r.role_id));
  const selectionHasBuiltin = selectedRoles.some((r) => r.is_builtin);

  const allSelected = roles.length > 0 && roles.every((r) => rowSelection[r.role_id]);
  const someSelected = roles.some((r) => rowSelection[r.role_id]);

  const columns: ColumnDef<TenantRole>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            roles.forEach((r) => {
              if (checked) next[r.role_id] = true;
              else delete next[r.role_id];
            });
            setRowSelection(next);
          }}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.role_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.role_id] = true;
            else delete next[row.original.role_id];
            setRowSelection(next);
          }}
          aria-label={`Pilih ${row.original.name}`}
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
          <p className="flex items-center gap-1.5 truncate font-semibold text-foreground">
            {row.original.is_builtin ? <ShieldCheck className="h-4 w-4 text-primary" /> : null}
            {row.original.name}
          </p>
          <p className="truncate text-sm text-muted-foreground">{row.original.code}</p>
        </div>
      ),
    },
    {
      id: "type",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("type")}>
          Tipe {sortIcon("type")}
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.is_builtin ? "secondary" : "outline"}>
          {row.original.is_builtin ? "Bawaan" : "Custom"}
        </Badge>
      ),
    },
    {
      id: "users",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("users")}>
          Jumlah User {sortIcon("users")}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-foreground">{row.original.user_count}</span>
      ),
    },
      {
      id: "actions",
      size: 180,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Lihat" onClick={() => setViewing(role)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit" disabled={role.is_builtin} onClick={() => setEditing(role)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Aksi lainnya">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{role.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCloning(role)}>
                  <Copy className="h-4 w-4" /> Clone
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={role.is_builtin}
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setRowSelection({ [role.role_id]: true });
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        {selectedIds.length > 0 ? (
          <BulkActionBar
            selectedCount={selectedIds.length}
            selectedIds={selectedIds}
            selectionHasBuiltin={selectionHasBuiltin}
            onConfirm={() => setConfirmDelete(true)}
          />
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={roles}
        getRowId={(row) => row.role_id}
        rowSelection={rowSelection}
        emptyText="Tidak ada role yang cocok."
      />
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Halaman {meta.page} dari {pageCount} · {meta.total} role
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
        <RoleDialog
          role={editing}
          permissions={permissions}
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
      {cloning ? (
        <RoleDialog
          cloneFrom={cloning}
          permissions={permissions}
          open={Boolean(cloning)}
          onOpenChange={(open) => {
            if (!open) setCloning(null);
          }}
        />
      ) : null}
      {viewing ? (
        <RoleViewDialog
          role={viewing}
          permissions={permissions}
          open={Boolean(viewing)}
          onOpenChange={(open) => {
            if (!open) setViewing(null);
          }}
        />
      ) : null}

      <BulkDeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        selectedIds={selectedIds}
        onDone={() => setRowSelection({})}
      />
    </div>
  );
}

function BulkActionBar({
  selectedCount,
  selectedIds,
  selectionHasBuiltin,
  onConfirm,
}: {
  selectedCount: number;
  selectedIds: string[];
  selectionHasBuiltin: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <span>{selectedCount} dipilih</span>
      <Button
        size="sm"
        variant="destructive"
        className="gap-1"
        disabled={selectionHasBuiltin}
        onClick={onConfirm}
      >
        <Trash2 className="h-4 w-4" /> Hapus
      </Button>
      {selectionHasBuiltin ? (
        <span className="text-xs text-destructive">{BULK_DELETE_BUILTIN_BLOCKED}</span>
      ) : null}
      <span className="sr-only">{selectedIds.length} role dipilih</span>
    </div>
  );
}

function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  selectedIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onDone: () => void;
}) {
  const bulkDelete = useBulkDeleteTenantRoles();
  const count = selectedIds.length;

  async function onConfirm() {
    try {
      await bulkDelete.mutateAsync(selectedIds);
      toast.success(`${count} role dihapus.`);
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus role." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${count} role?`}
      description={bulkDeleteRolesConfirm(count)}
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={bulkDelete.isPending}
      destructive
      canConfirm={count > 0}
      onConfirm={onConfirm}
    />
  );
}

function RoleDialog({
  role,
  cloneFrom,
  permissions,
  open,
  onOpenChange,
}: {
  role?: TenantRole;
  cloneFrom?: TenantRole;
  permissions: Permission[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const create = useCreateTenantRole();
  const update = useUpdateTenantRole(role?.role_id ?? "");
  const defaultValues = React.useMemo<CreateTenantRoleForm>(() => ({
    code: cloneFrom ? `${cloneFrom.code}_copy` : role?.code ?? "",
    name: cloneFrom ? `${cloneFrom.name} Copy` : role?.name ?? "",
    permissions: role?.permissions ?? cloneFrom?.permissions ?? [],
  }), [cloneFrom, role]);
  const form = useForm<CreateTenantRoleForm>({
    resolver: zodResolver(createTenantRoleSchema),
    defaultValues,
  });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const title = role ? "Edit role custom" : cloneFrom ? "Clone role bawaan" : "Buat role custom";
  const loading = create.isPending || update.isPending;

  async function onSubmit(values: CreateTenantRoleForm) {
    try {
      if (role) {
        await update.mutateAsync({ name: values.name, permissions: values.permissions });
        toast.success("Role diperbarui.");
      } else {
        await create.mutateAsync(values);
        toast.success("Role dibuat.");
        form.reset({ code: "", name: "", permissions: [] });
      }
      setOpen(false);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan role." }));
      }
    }
  }

  const trigger = open === undefined ? (
    <DialogTrigger asChild>
      <Button variant={role ? "outline" : cloneFrom ? "secondary" : "default"}>
        <Plus className="h-4 w-4" /> {cloneFrom ? <Copy className="h-4 w-4" /> : null}
        {role ? "Edit" : cloneFrom ? "Clone" : "Buat Role"}
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pilih hanya izin yang tersedia dalam akun Anda. Server akan menolak eskalasi privilege.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>Kode</FormLabel>
                <FormControl><Input {...field} disabled={Boolean(role)} placeholder="wakil_kurikulum" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nama</FormLabel>
                <FormControl><Input {...field} placeholder="Wakil Kepala Kurikulum" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="permissions" render={({ field }) => (
              <FormItem>
                <FormLabel>Izin</FormLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {permissions.map((permission) => {
                    const checked = field.value.includes(permission.code);
                    return (
                      <label key={permission.code} className="flex items-start gap-2 rounded-md border p-3 text-sm">
                        <Checkbox
                          checked={checked}
                          disabled={!permission.held}
                          onCheckedChange={(next) => {
                            const value = next
                              ? [...field.value, permission.code]
                              : field.value.filter((code) => code !== permission.code);
                            field.onChange(value);
                          }}
                        />
                        <span>
                          <span className="block font-medium">{permission.code}</span>
                          <span className="block text-xs text-muted-foreground">{permission.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="submit" loading={loading}>Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RoleViewDialog({
  role,
  permissions,
  open,
  onOpenChange,
}: {
  role: TenantRole;
  permissions: Permission[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const active = new Set(role.permissions);
  const heldPermissions = permissions.filter((p) => active.has(p.code));
  const inactiveHeld = permissions.filter((p) => !active.has(p.code));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail role: {role.name}</DialogTitle>
          <DialogDescription>
            Ringkasan izin aktif untuk role <span className="font-medium text-foreground">{role.code}</span>.
            {role.is_builtin ? " Role bawaan tidak dapat diubah." : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Nama</p>
              <p className="font-semibold text-foreground">{role.name}</p>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Kode</p>
              <p className="font-mono text-foreground">{role.code}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Izin aktif</h4>
              <Badge variant="secondary">{heldPermissions.length} izin</Badge>
            </div>
            {heldPermissions.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Role ini belum memiliki izin aktif.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {heldPermissions.map((permission) => (
                  <div
                    key={permission.code}
                    className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm"
                  >
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <span className="block font-medium text-foreground">{permission.code}</span>
                      <span className="block text-xs text-muted-foreground">{permission.description}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {inactiveHeld.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Izin tersedia (tidak aktif)</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {inactiveHeld.map((permission) => (
                  <div
                    key={permission.code}
                    className="flex items-start gap-2 rounded-md border p-3 text-sm opacity-70"
                  >
                    <span>
                      <span className="block font-medium text-foreground">{permission.code}</span>
                      <span className="block text-xs text-muted-foreground">{permission.description}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
