"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  Archive,
  ChevronsUpDown,
  Link2,
  Link2Off,
  LinkIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTableCard } from "@/components/ui/data-table-card";
import { DatePicker } from "@/components/ui/date-picker";
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
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Form, FormControl, FormField, FormItem, FormLabel, FormLabelRequired, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Combobox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { ImportDialog } from "@/components/features/academic-ops/import-dialog";
import { PhotoUpload } from "@/components/features/academic-ops/photo-upload";
import { GuardedButton, TableSkeleton, type OpsContext } from "@/components/features/academic-ops/academic-ops-page";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { getErrorMessage } from "@/lib/errors/messages";
import { IMAGE_ACCEPT, IMAGE_SIZE_HINT, MAX_IMAGE_SELECT_SIZE_BYTES } from "@/lib/media/upload-constraints";
import {
  useArchiveTeacher,
  useBulkDeleteTeachers,
  useCreateTeacher,
  useDeleteTeacher,
  useLinkTeacherAccount,
  useUnlinkTeacherAccount,
  useUpdateTeacher,
  useUploadMedia,
} from "@/lib/query/mutations/use-academic-ops";
import { useTeachersTable, type Teacher } from "@/lib/query/queries/use-academic-ops";
import { useTenantUsers } from "@/lib/query/queries/use-tenant-users";
import { teacherSchema, type TeacherForm } from "@/lib/schemas/academic-ops";
import {
  parseTeachersParams,
  serializeTeachersParams,
  type TeachersParams,
  type TeachersSort,
} from "@/lib/schemas/teachers-params";
import { useSelectWithinPage } from "@/lib/data-table/use-select-within-page";

const TEACHER_ARCHIVE_REASONS = [
  { value: "nonaktif_sementara", label: "Nonaktif Sementara" },
  { value: "resign", label: "Resign" },
  { value: "mutasi", label: "Mutasi" },
  { value: "pensiun", label: "Pensiun" },
  { value: "meninggal", label: "Meninggal" },
  { value: "lainnya", label: "Lainnya" },
];

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  aktif: { label: "Aktif", variant: "default" },
  nonaktif: { label: "Nonaktif", variant: "secondary" },
  arsip: { label: "Arsip", variant: "outline" },
};

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
  const [importOpen, setImportOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<RowSelectionState>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    setSelected({});
  }, [params.page, params.search, params.sort]);

  const pageRows = teachers.data?.data ?? [];
  const selectWithinPage = useSelectWithinPage({
    rows: pageRows,
    rowSelection: selected,
    getRowId: (t) => t.teacher_id,
    onRowSelectionChange: setSelected,
    toggleMode: "some",
  });

  const meta = teachers.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 };
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  return (
    <div className="space-y-4">
      <DataTableCard
        title="Daftar Guru"
        description="Kelola master data guru, NIP, dan akun login."
        primaryActions={
          <>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Impor
            </Button>
            <TeacherDialog
              canManage={canManage}
              upgradeMessage={upgradeMessage}
              trigger={<Button size="sm">+ Tambah</Button>}
            />
          </>
        }
        toolbar={{
          selectAll: {
            checked: selectWithinPage.checked,
            disabled: selectWithinPage.disabled,
            onToggle: () => selectWithinPage.toggleAll(),
          },
          bulkActions: selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>{selectedIds.length} dipilih</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    Aksi massal <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Aksi untuk {selectedIds.length} guru</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!canManage}
                    className="text-destructive focus:text-destructive"
                    onClick={() => { setPendingId(null); setConfirmDelete(true); }}
                  >
                    <Trash2 className="h-4 w-4" /> Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null,
          search: (
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Cari nama atau NIP"
              className="min-w-[160px] sm:flex-1 lg:flex-1"
            />
          ),
        }}
        pagination={{
          page: meta.page,
          pageCount,
          total: meta.total,
          label: "guru",
          onPrev: () => replaceParams(router, { ...params, page: meta.page - 1 }),
          onNext: () => replaceParams(router, { ...params, page: meta.page + 1 }),
        }}
      >
        {teachers.isLoading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : teachers.error ? (
          <p className="px-4 text-sm text-destructive">{getErrorMessage(teachers.error)}</p>
        ) : (
          <TeachersTable
            teachers={pageRows}
            params={params}
            canManage={canManage}
            upgradeMessage={upgradeMessage}
            rowSelection={selected}
            onRowSelectionChange={setSelected}
            onStartDelete={(id) => { setPendingId(id); setSelected({ [id]: true }); setConfirmDelete(true); }}
            onParamsChange={(next) => replaceParams(router, next)}
          />
        )}
      </DataTableCard>

      <DeleteConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        ids={pendingId ? [pendingId] : selectedIds}
        onDone={() => { setSelected({}); setPendingId(null); }}
      />

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

function TeachersTable({
  teachers,
  params,
  canManage,
  upgradeMessage,
  rowSelection,
  onRowSelectionChange,
  onStartDelete,
  onParamsChange,
}: {
  teachers: Teacher[];
  params: TeachersParams;
  canManage: boolean;
  upgradeMessage: string;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (value: RowSelectionState) => void;
  onStartDelete: (id: string) => void;
  onParamsChange: (params: TeachersParams) => void;
}) {
  const [editing, setEditing] = React.useState<Teacher | null>(null);
  const [linking, setLinking] = React.useState<Teacher | null>(null);
  const [unlinking, setUnlinking] = React.useState<Teacher | null>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<Teacher | null>(null);

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

  const columns: ColumnDef<Teacher>[] = [
    {
      id: "select",
      size: 40,
      header: () => null,
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.teacher_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.teacher_id] = true;
            else delete next[row.original.teacher_id];
            onRowSelectionChange(next);
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
      id: "status",
      header: () => <span>Status</span>,
      cell: ({ row }) => {
        const status = row.original.status;
        const config = STATUS_LABELS[status] ?? { label: status, variant: "outline" };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "account",
      header: () => <span>Akun</span>,
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              {row.original.user_id ? (
                <Link2 className="h-4 w-4 text-green-600" />
              ) : (
                <Link2Off className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {row.original.user_id ? "Terhubung" : "Belum terhubung"}
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: "actions",
      size: 140,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const teacher = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit" disabled={!canManage} onClick={() => setEditing(teacher)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canManage} aria-label="Aksi lainnya">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{teacher.full_name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={!canManage} onClick={() => setLinking(teacher)}>
                  <LinkIcon className="h-4 w-4" /> Hubungkan akun
                </DropdownMenuItem>
                {teacher.user_id && (
                  <DropdownMenuItem
                    disabled={!canManage}
                    className="text-destructive focus:text-destructive"
                    onClick={() => setUnlinking(teacher)}
                  >
                    <Link2Off className="h-4 w-4" /> Putuskan akun
                  </DropdownMenuItem>
                )}
                {teacher.status !== "arsip" && (
                  <DropdownMenuItem disabled={!canManage} onClick={() => setArchiveTarget(teacher)}>
                    <Archive className="h-4 w-4" /> Arsipkan
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={!canManage}
                  className="text-destructive focus:text-destructive"
                  onClick={() => onStartDelete(teacher.teacher_id)}
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
    <div>
      <DataTable
        columns={columns}
        data={teachers}
        getRowId={(row) => row.teacher_id}
        rowSelection={rowSelection}
        emptyText="Tidak ada guru yang cocok."
        classNames={{ wrapper: "rounded-none !border-x-0" }}
      />

      {editing ? (
        <TeacherDialog
          teacher={editing}
          canManage={canManage}
          upgradeMessage={upgradeMessage}
          open={Boolean(editing)}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
        />
      ) : null}

      {linking ? (
        <LinkAccountDialog
          teacher={linking}
          canManage={canManage}
          open={Boolean(linking)}
          onOpenChange={(open) => { if (!open) setLinking(null); }}
        />
      ) : null}

      {archiveTarget ? (
        <ArchiveTeacherDialog
          teacher={archiveTarget}
          canManage={canManage}
          open={Boolean(archiveTarget)}
          onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
        />
      ) : null}

      {unlinking ? (
        <UnlinkAccountDialog
          teacher={unlinking}
          open={Boolean(unlinking)}
          onOpenChange={(open) => { if (!open) setUnlinking(null); }}
        />
      ) : null}
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
  canManage,
  open,
  onOpenChange,
}: {
  teacher: Teacher;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const link = useLinkTeacherAccount();
  const [userId, setUserId] = React.useState(teacher.user_id ?? "");
  const [search, setSearch] = React.useState("");

  const users = useTenantUsers(
    React.useMemo(
      () => ({ search, page: 1, page_size: 50, sort: "name" as const }),
      [search],
    ),
  );

  const teacherUsers = React.useMemo(
    () =>
      (users.data?.data ?? []).filter(
        (u) => u.roles.includes("teacher") || u.roles.includes("homeroom_teacher"),
      ),
    [users.data],
  );

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
        <Combobox
          searchable
          items={teacherUsers}
          isLoading={users.isLoading}
          isSearchLoading={users.isFetching}
          value={userId}
          onValueChange={setUserId}
          getOptionValue={(user) => user.user_id}
          getOptionLabel={(user) => `${user.full_name} (${user.email ?? user.username})`}
          placeholder="Pilih akun guru"
          searchPlaceholder="Cari akun guru..."
          emptyText="Belum ada akun guru"
          onSearchChange={setSearch}
          popoverModal
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

function UnlinkAccountDialog({
  teacher,
  open,
  onOpenChange,
}: {
  teacher: Teacher;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const unlink = useUnlinkTeacherAccount();

  async function onConfirm() {
    try {
      await unlink.mutateAsync({ teacherId: teacher.teacher_id });
      toast.success("Akun guru diputus.");
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa memutus akun." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Putuskan akun — ${teacher.full_name}?`}
      description="Guru tidak bisa memasukkan nilai setelah akun diputus. Hubungkan ulang kapan saja melalui menu Hubungkan akun."
      confirmLabel="Putuskan"
      loadingLabel="Memutus..."
      loading={unlink.isPending}
      destructive
      canConfirm
      onConfirm={onConfirm}
    />
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
  const uploadPhoto = useUploadMedia();
  const [pendingPhoto, setPendingPhoto] = React.useState<File | null>(null);
  const defaultValues = React.useMemo<TeacherForm>(
    () => ({
      nip: teacher?.nip ?? "",
      full_name: teacher?.full_name ?? "",
      nik: teacher?.nik ?? "",
      education_level: teacher?.education_level ?? "",
      gender: teacher?.gender as "male" | "female" ?? "",
      birth_date: teacher?.birth_date ?? "",
      birth_place: teacher?.birth_place ?? "",
      address_line: teacher?.address_line ?? "",
      phone_number: teacher?.phone_number ?? "",
      email: teacher?.email ?? "",
      employment_status: teacher?.employment_status ?? "",
      role_position: teacher?.role_position ?? "",
      start_date: teacher?.start_date ?? "",
      end_date: teacher?.end_date ?? "",
      primary_subject_area: teacher?.primary_subject_area ?? "",
      nuptk: teacher?.nuptk ?? "",
      certification_number: teacher?.certification_number ?? "",
    }),
    [teacher],
  );
  const form = useForm<TeacherForm>({ resolver: zodResolver(teacherSchema), defaultValues });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const loading = create.isPending || update.isPending || uploadPhoto.isPending;

  async function onSubmit(values: TeacherForm) {
    try {
      if (teacher) {
        await update.mutateAsync(values);
        toast.success("Guru diperbarui.");
      } else {
        const created = await create.mutateAsync(values);
        if (pendingPhoto) {
          await uploadPhoto.mutateAsync({ ownerType: "teacher", ownerId: created.teacher_id, file: pendingPhoto });
          setPendingPhoto(null);
        }
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
      <DialogContent className="max-h-[90vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>{teacher ? "Edit guru" : "Tambah guru"}</DialogTitle>
          <DialogDescription>NIP unik per sekolah.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="nip"
              render={({ field }) => (
                <FormItem>
                  <FormLabelRequired>NIP</FormLabelRequired>
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
                  <FormLabelRequired>Nama lengkap</FormLabelRequired>
                  <FormControl>
                    <Input {...field} placeholder="Grace Hopper" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nik"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIK</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="3201012345678901" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="education_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pendidikan</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="S1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Pilih gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Laki-laki</SelectItem>
                        <SelectItem value="female">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal lahir</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="1990-01-01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="birth_place"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tempat lahir</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Jakarta" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address_line"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Jl. Pendidikan No. 1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor telepon</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="081234567890" />
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
                      <Input {...field} placeholder="guru@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="employment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status kepegawaian</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Tetap" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jabatan</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Guru Kelas" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
              <FormLabel>Foto guru</FormLabel>
              {teacher ? (
                <PhotoUpload ownerType="teacher" ownerId={teacher.teacher_id} disabled={!canManage} />
              ) : (
                <FileDropzone
                  value={pendingPhoto}
                  onChange={setPendingPhoto}
                  accept={IMAGE_ACCEPT}
                  maxSize={MAX_IMAGE_SELECT_SIZE_BYTES}
                  prompt="Tarik foto ke sini atau klik untuk memilih"
                  hint={`${IMAGE_SIZE_HINT} Foto diunggah setelah guru disimpan.`}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal masuk</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="2020-01-01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal keluar</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="—" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="primary_subject_area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bidang mata pelajaran</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Matematika" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nuptk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NUPTK</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1234567890123456" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="certification_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor sertifikasi</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="—" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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

function ArchiveTeacherDialog({
  teacher,
  canManage,
  open,
  onOpenChange,
}: {
  teacher: Teacher;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const archive = useArchiveTeacher();
  const [reason, setReason] = React.useState("");

  async function onConfirm() {
    if (!reason) return;
    try {
      await archive.mutateAsync({ teacherId: teacher.teacher_id, reason });
      toast.success("Guru diarsipkan.");
      onOpenChange(false);
      setReason("");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa mengarsipkan guru." }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Arsipkan guru — {teacher.full_name}</DialogTitle>
          <DialogDescription>
            Pilih alasan pengarsipan. Guru yang diarsipkan tidak akan muncul di daftar aktif.
          </DialogDescription>
        </DialogHeader>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih alasan arsip" />
          </SelectTrigger>
          <SelectContent>
            {TEACHER_ARCHIVE_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" disabled={!canManage || !reason || archive.isPending} loading={archive.isPending} onClick={onConfirm}>
            Arsipkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
