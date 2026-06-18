"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  LinkIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { QuerySelect } from "@/components/ui/query-select";
import { toast } from "@/components/ui/toaster";
import { ImportDialog } from "@/components/features/academic-ops/import-dialog";
import { GuardedButton, TableSkeleton, type OpsContext } from "@/components/features/academic-ops/academic-ops-page";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { getErrorMessage } from "@/lib/errors/messages";
import {
  useBulkDeleteTeachers,
  useCreateTeacher,
  useDeleteTeacher,
  useLinkTeacherAccount,
  useUpdateTeacher,
} from "@/lib/query/mutations/use-academic-ops";
import { useTeachersTable, type Teacher } from "@/lib/query/queries/use-academic-ops";
import { useTenantUsers, type TenantUser } from "@/lib/query/queries/use-tenant-users";
import { teacherSchema, type TeacherForm } from "@/lib/schemas/academic-ops";
import {
  parseTeachersParams,
  serializeTeachersParams,
  type TeachersParams,
  type TeachersSort,
} from "@/lib/schemas/teachers-params";

const SORT_FIELDS: Record<string, { asc: TeachersSort; desc: TeachersSort }> = {
  name: { asc: "name", desc: "-name" },
  nip: { asc: "nip", desc: "-nip" },
};

export function TeachersScreen({ canManage, upgradeMessage }: OpsContext) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseTeachersParams(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");
  const teachers = useTeachersTable(params);
  const users = useTenantUsers();
  const [importOpen, setImportOpen] = React.useState(false);

  const teacherUsers = React.useMemo(
    () =>
      (users.data?.data ?? []).filter(
        (user) => user.roles.includes("teacher") || user.roles.includes("homeroom_teacher"),
      ),
    [users.data],
  );

  React.useEffect(() => {
    setSearchDraft(params.search ?? "");
  }, [params.search]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search ?? "") !== searchDraft) {
        replaceParams(router, { ...params, search: searchDraft || undefined, page: 1 });
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [params, router, searchDraft]);

  return (
    <div className="space-y-4">
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Daftar Guru</CardTitle>
              <CardDescription>Kelola master data guru, NIP, dan akun login.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Cari nama atau NIP"
                className="md:w-72"
              />
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Impor
              </Button>
              <TeacherDialog
                canManage={canManage}
                upgradeMessage={upgradeMessage}
                trigger={<Button size="sm">+ Tambah</Button>}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {teachers.isLoading ? (
            <TableSkeleton />
          ) : teachers.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(teachers.error)}</p>
          ) : (
            <TeachersTable
              teachers={teachers.data?.data ?? []}
              meta={teachers.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 }}
              params={params}
              canManage={canManage}
              upgradeMessage={upgradeMessage}
              teacherUsers={teacherUsers}
              usersLoading={users.isLoading}
              onParamsChange={(next) => replaceParams(router, next)}
            />
          )}
        </CardContent>
      </Card>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        kind="teachers"
        templateHref="/templates/teachers-template.xlsx"
        templateLabel="Unduh Template Guru"
      />
    </div>
  );
}

function replaceParams(router: ReturnType<typeof useRouter>, params: TeachersParams) {
  const query = serializeTeachersParams(params);
  router.replace(query ? `/teachers?${query}` : "/teachers", { scroll: false });
}

type Meta = { page: number; page_size: number; total: number };

function TeachersTable({
  teachers,
  meta,
  params,
  canManage,
  upgradeMessage,
  teacherUsers,
  usersLoading,
  onParamsChange,
}: {
  teachers: Teacher[];
  meta: Meta;
  params: TeachersParams;
  canManage: boolean;
  upgradeMessage: string;
  teacherUsers: TenantUser[];
  usersLoading: boolean;
  onParamsChange: (params: TeachersParams) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [editing, setEditing] = React.useState<Teacher | null>(null);
  const [linking, setLinking] = React.useState<Teacher | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRowSelection({});
  }, [params.page, params.search, params.sort]);

  function toggleSort(field: keyof typeof SORT_FIELDS) {
    const { asc, desc } = SORT_FIELDS[field];
    onParamsChange({ ...params, sort: params.sort === asc ? desc : asc, page: 1 });
  }

  function sortIcon(field: keyof typeof SORT_FIELDS) {
    const { asc, desc } = SORT_FIELDS[field];
    if (params.sort === asc) return <ArrowUp className="h-3.5 w-3.5" />;
    if (params.sort === desc) return <ArrowDown className="h-3.5 w-3.5" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
  }

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const allSelected = teachers.length > 0 && teachers.every((t) => rowSelection[t.teacher_id]);
  const someSelected = teachers.some((t) => rowSelection[t.teacher_id]);

  function startDelete(id: string) {
    setPendingId(id);
    setRowSelection({ [id]: true });
    setConfirmDelete(true);
  }

  const columns: ColumnDef<Teacher>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            teachers.forEach((t) => {
              if (checked) next[t.teacher_id] = true;
              else delete next[t.teacher_id];
            });
            setRowSelection(next);
          }}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.teacher_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.teacher_id] = true;
            else delete next[row.original.teacher_id];
            setRowSelection(next);
          }}
          aria-label={`Pilih ${row.original.full_name}`}
        />
      ),
    },
    {
      id: "nip",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("nip")}>
          NIP {sortIcon("nip")}
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.nip}</span>,
    },
    {
      id: "name",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("name")}>
          Nama {sortIcon("name")}
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.full_name}</span>,
    },
    {
      id: "account",
      header: () => <span>Akun</span>,
      cell: ({ row }) =>
        row.original.user_id ? (
          <Badge variant="secondary">Terhubung</Badge>
        ) : (
          <Badge variant="outline">Belum terhubung</Badge>
        ),
    },
    {
      id: "actions",
      size: 72,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const teacher = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <MoreHorizontal className="h-4 w-4" /> Aksi
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{teacher.full_name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!canManage} onClick={() => setEditing(teacher)}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canManage} onClick={() => setLinking(teacher)}>
                <LinkIcon className="h-4 w-4" /> Hubungkan akun
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canManage}
                className="text-destructive focus:text-destructive"
                onClick={() => startDelete(teacher.teacher_id)}
              >
                <Trash2 className="h-4 w-4" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <span>{selectedIds.length} dipilih</span>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1"
            disabled={!canManage}
            onClick={() => {
              setPendingId(null);
              setConfirmDelete(true);
            }}
          >
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={teachers}
        getRowId={(row) => row.teacher_id}
        rowSelection={rowSelection}
        emptyText="Tidak ada guru yang cocok."
      />

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Halaman {meta.page} dari {pageCount} · {meta.total} guru
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
        <TeacherDialog
          teacher={editing}
          canManage={canManage}
          upgradeMessage={upgradeMessage}
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}

      {linking ? (
        <LinkAccountDialog
          teacher={linking}
          teacherUsers={teacherUsers}
          usersLoading={usersLoading}
          canManage={canManage}
          open={Boolean(linking)}
          onOpenChange={(open) => {
            if (!open) setLinking(null);
          }}
        />
      ) : null}

      <DeleteConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        ids={pendingId ? [pendingId] : selectedIds}
        onDone={() => {
          setRowSelection({});
          setPendingId(null);
        }}
      />
    </div>
  );
}

function DeleteConfirm({
  open,
  onOpenChange,
  ids,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
  onDone: () => void;
}) {
  const singleDelete = useDeleteTeacher();
  const bulkDelete = useBulkDeleteTeachers();
  const count = ids.length;

  async function onConfirm() {
    try {
      if (count === 1) {
        await singleDelete.mutateAsync(ids[0]);
      } else {
        await bulkDelete.mutateAsync(ids);
      }
      toast.success(`${count} guru dihapus.`);
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus guru." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${count} guru?`}
      description="Guru yang masih ditugaskan mengajar tidak bisa dihapus. Akun login yang terhubung tidak ikut dihapus."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={singleDelete.isPending || bulkDelete.isPending}
      destructive
      canConfirm={count > 0}
      onConfirm={onConfirm}
    />
  );
}

function LinkAccountDialog({
  teacher,
  teacherUsers,
  usersLoading,
  canManage,
  open,
  onOpenChange,
}: {
  teacher: Teacher;
  teacherUsers: TenantUser[];
  usersLoading: boolean;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const link = useLinkTeacherAccount();
  const [userId, setUserId] = React.useState(teacher.user_id ?? "");

  React.useEffect(() => {
    setUserId(teacher.user_id ?? "");
  }, [teacher]);

  async function onConfirm() {
    if (!userId) return;
    try {
      await link.mutateAsync({ teacherId: teacher.teacher_id, userId });
      toast.success("Akun guru terhubung.");
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghubungkan akun." }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hubungkan akun — {teacher.full_name}</DialogTitle>
          <DialogDescription>
            Pilih akun pengguna bertipe guru untuk menghubungkan dengan profil guru ini.
          </DialogDescription>
        </DialogHeader>
        <QuerySelect
          items={teacherUsers}
          isLoading={usersLoading}
          value={userId}
          onValueChange={setUserId}
          getValue={(user) => user.user_id}
          getLabel={(user) => `${user.full_name} (${user.email ?? user.username})`}
          placeholder="Pilih akun guru"
          emptyText="Belum ada akun guru"
        />
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" disabled={!canManage || !userId || link.isPending} loading={link.isPending} onClick={onConfirm}>
            Hubungkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeacherDialog({
  teacher,
  canManage,
  upgradeMessage,
  open,
  onOpenChange,
  trigger,
}: {
  teacher?: Teacher;
  canManage: boolean;
  upgradeMessage: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const create = useCreateTeacher();
  const update = useUpdateTeacher(teacher?.teacher_id ?? "");
  const defaultValues = React.useMemo<TeacherForm>(
    () => ({ nip: teacher?.nip ?? "", full_name: teacher?.full_name ?? "" }),
    [teacher],
  );
  const form = useForm<TeacherForm>({ resolver: zodResolver(teacherSchema), defaultValues });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const loading = create.isPending || update.isPending;

  async function onSubmit(values: TeacherForm) {
    try {
      if (teacher) {
        await update.mutateAsync(values);
        toast.success("Guru diperbarui.");
      } else {
        await create.mutateAsync(values);
        toast.success("Guru ditambahkan.");
        form.reset({ nip: "", full_name: "" });
      }
      setOpen(false);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan guru." }));
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{teacher ? "Edit guru" : "Tambah guru"}</DialogTitle>
          <DialogDescription>NIP unik per tenant.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="nip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIP</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="T-001" />
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
                    <Input {...field} placeholder="Grace Hopper" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <GuardedButton enabled={canManage} message={upgradeMessage} loading={loading}>
                Simpan
              </GuardedButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
