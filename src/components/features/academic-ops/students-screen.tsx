"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Control, type FieldValues } from "react-hook-form";
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
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Textarea } from "@/components/ui/textarea";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormLabelRequired, FormMessage } from "@/components/ui/form";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { ImportDialog } from "@/components/features/academic-ops/import-dialog";
import { PhotoUpload } from "@/components/features/academic-ops/photo-upload";
import { DatePicker } from "@/components/ui/date-picker";
import { GuardedButton, TableSkeleton, type OpsContext } from "@/components/features/academic-ops/academic-ops-page";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { getErrorMessage } from "@/lib/errors/messages";
import { formatDate } from "@/lib/date-utils";
import { IMAGE_ACCEPT, IMAGE_SIZE_HINT, MAX_IMAGE_SELECT_SIZE_BYTES } from "@/lib/media/upload-constraints";
import {
  useArchiveStudent,
  useBulkDeleteStudents,
  useCreateStudent,
  useDeleteStudent,
  useUpdateStudent,
  useLinkStudentAccount,
  useUnlinkStudentAccount,
  useLinkGuardian,
  useUnlinkGuardian,
  useUploadMedia,
} from "@/lib/query/mutations/use-academic-ops";
import { useStudentsTable, useStudentEnrollmentsByYear, type Student, useStudentGuardians } from "@/lib/query/queries/use-academic-ops";
import { useAcademicYears } from "@/lib/query/queries/use-academic-config";
import { studentSchema, type StudentForm } from "@/lib/schemas/academic-ops";
import {
  parseStudentsParams,
  serializeStudentsParams,
  type StudentsParams,
  type StudentsSort,
} from "@/lib/schemas/students-params";
import { useTenantUsers, type TenantUser } from "@/lib/query/queries/use-tenant-users";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectWithinPage } from "@/lib/data-table/use-select-within-page";

const STUDENT_ARCHIVE_REASONS = [
  { value: "nonaktif_sementara", label: "Nonaktif Sementara" },
  { value: "lulus", label: "Lulus" },
  { value: "pindah", label: "Pindah Sekolah" },
  { value: "keluar", label: "Keluar" },
  { value: "meninggal", label: "Meninggal" },
  { value: "lainnya", label: "Lainnya" },
];

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; }> = {
  aktif: { label: "Aktif", variant: "default" },
  nonaktif: { label: "Nonaktif", variant: "secondary" },
  arsip: { label: "Arsip", variant: "outline" },
};

const SORT_FIELDS: Record<string, { asc: StudentsSort; desc: StudentsSort; }> = {
  name: { asc: "name", desc: "-name" },
  nis: { asc: "nis", desc: "-nis" },
};

export function StudentsScreen({ canManage, upgradeMessage }: OpsContext) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseStudentsParams(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");
  const students = useStudentsTable(params);
  const users = useTenantUsers();
  const academicYears = useAcademicYears();
  const activeYearId = academicYears.data?.find((y) => y.status === "Active")?.academic_year_id;
  const enrollments = useStudentEnrollmentsByYear(activeYearId);
  const homeroomMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const e of enrollments.data ?? []) map.set(e.student_id, e.homeroom_name);
    return map;
  }, [enrollments.data]);
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

  const pageRows = students.data?.data ?? [];
  const selectWithinPage = useSelectWithinPage({
    rows: pageRows,
    rowSelection: selected,
    getRowId: (s) => s.student_id,
    onRowSelectionChange: setSelected,
    toggleMode: "some",
  });

  const meta = students.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 };
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  return (
    <div className="space-y-4">
      <DataTableCard
        title="Daftar Siswa"
        description="Kelola master data siswa dan identitas NIS."
        primaryActions={
          <>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Impor
            </Button>
            <StudentDialog
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
                  <DropdownMenuLabel>Aksi untuk {selectedIds.length} siswa</DropdownMenuLabel>
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
              placeholder="Cari nama atau NIS"
              className="min-w-[160px] sm:flex-1 lg:flex-1"
            />
          ),
        }}
        pagination={{
          page: meta.page,
          pageCount,
          total: meta.total,
          label: "siswa",
          onPrev: () => replaceParams(router, { ...params, page: meta.page - 1 }),
          onNext: () => replaceParams(router, { ...params, page: meta.page + 1 }),
        }}
      >
        {students.isLoading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : students.error ? (
          <p className="px-4 text-sm text-destructive">{getErrorMessage(students.error)}</p>
        ) : (
          <StudentsTable
            students={pageRows}
            params={params}
            canManage={canManage}
            upgradeMessage={upgradeMessage}
            usersList={users.data?.data ?? []}
            usersLoading={users.isLoading}
            homeroomMap={homeroomMap}
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
        kind="students"
        templateHref="/templates/students-template.xlsx"
        templateLabel="Unduh Template Siswa"
      />
    </div>
  );
}

function replaceParams(router: ReturnType<typeof useRouter>, params: StudentsParams) {
  const query = serializeStudentsParams(params);
  router.replace(query ? `/students?${query}` : "/students", { scroll: false });
}

function StudentsTable({
  students,
  params,
  canManage,
  upgradeMessage,
  usersList,
  usersLoading,
  homeroomMap,
  rowSelection,
  onRowSelectionChange,
  onStartDelete,
  onParamsChange,
}: {
  students: Student[];
  params: StudentsParams;
  canManage: boolean;
  upgradeMessage: string;
  usersList: TenantUser[];
  usersLoading: boolean;
  homeroomMap: Map<string, string>;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (value: RowSelectionState) => void;
  onStartDelete: (id: string) => void;
  onParamsChange: (params: StudentsParams) => void;
}) {
  const [editing, setEditing] = React.useState<Student | null>(null);
  const [linking, setLinking] = React.useState<Student | null>(null);
  const [unlinking, setUnlinking] = React.useState<Student | null>(null);
  const [managingGuardians, setManagingGuardians] = React.useState<Student | null>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<Student | null>(null);

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

  const columns: ColumnDef<Student>[] = [
    {
      id: "select",
      size: 40,
      header: () => null,
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.student_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.student_id] = true;
            else delete next[row.original.student_id];
            onRowSelectionChange(next);
          }}
          aria-label={`Pilih ${row.original.full_name}`}
        />
      ),
    },
    {
      id: "nis",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("nis")}>
          NIS {sortIcon("nis")}
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.nis}</span>,
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
      id: "gender",
      header: () => <span>Gender</span>,
      cell: ({ row }) => <span className="text-muted-foreground">{genderLabel(row.original.gender)}</span>,
    },
    {
      id: "birth_date",
      header: () => <span>Tgl Lahir</span>,
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.birth_date)}</span>,
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
      id: "homeroom",
      header: () => <span>Kelas</span>,
      cell: ({ row }) => {
        const name = homeroomMap.get(row.original.student_id);
        return name ? (
          <span className="font-medium">{name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
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
        const student = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit" disabled={!canManage} onClick={() => setEditing(student)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canManage} aria-label="Aksi lainnya">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{student.full_name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={!canManage} onClick={() => setLinking(student)}>
                  <LinkIcon className="h-4 w-4" /> Hubungkan akun
                </DropdownMenuItem>
                {student.user_id && (
                  <DropdownMenuItem
                    disabled={!canManage}
                    className="text-destructive focus:text-destructive"
                    onClick={() => setUnlinking(student)}
                  >
                    <Link2Off className="h-4 w-4" /> Putuskan akun
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem disabled={!canManage} onClick={() => setManagingGuardians(student)}>
                  <Users className="h-4 w-4" /> Wali murid
                </DropdownMenuItem>
                {student.status !== "arsip" && (
                  <DropdownMenuItem disabled={!canManage} onClick={() => setArchiveTarget(student)}>
                    <Archive className="h-4 w-4" /> Arsipkan
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={!canManage}
                  className="text-destructive focus:text-destructive"
                  onClick={() => onStartDelete(student.student_id)}
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
        data={students}
        getRowId={(row) => row.student_id}
        rowSelection={rowSelection}
        emptyText="Tidak ada siswa yang cocok."
        classNames={{ wrapper: "rounded-none !border-x-0" }}
      />

      {editing ? (
        <StudentDialog
          student={editing}
          canManage={canManage}
          upgradeMessage={upgradeMessage}
          open={Boolean(editing)}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
        />
      ) : null}

      {linking ? (
        <LinkAccountDialog
          student={linking}
          canManage={canManage}
          open={Boolean(linking)}
          onOpenChange={(open) => { if (!open) setLinking(null); }}
        />
      ) : null}

      {managingGuardians ? (
        <GuardiansManagerDialog
          student={managingGuardians}
          usersList={usersList}
          usersLoading={usersLoading}
          canManage={canManage}
          open={Boolean(managingGuardians)}
          onOpenChange={(open) => { if (!open) setManagingGuardians(null); }}
        />
      ) : null}

      {archiveTarget ? (
        <ArchiveStudentDialog
          student={archiveTarget}
          canManage={canManage}
          open={Boolean(archiveTarget)}
          onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
        />
      ) : null}

      {unlinking ? (
        <UnlinkStudentAccountDialog
          student={unlinking}
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
  const singleDelete = useDeleteStudent();
  const bulkDelete = useBulkDeleteStudents();
  const count = ids.length;

  async function onConfirm() {
    try {
      if (count === 1) {
        await singleDelete.mutateAsync(ids[0]);
      } else {
        await bulkDelete.mutateAsync(ids);
      }
      toast.success(`${count} siswa dihapus.`);
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus siswa." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${count} siswa?`}
      description="Siswa dengan enrollment aktif tidak bisa dihapus."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={singleDelete.isPending || bulkDelete.isPending}
      destructive
      canConfirm={count > 0}
      onConfirm={onConfirm}
    />
  );
}

function StudentDialog({
  student,
  canManage,
  upgradeMessage,
  open,
  onOpenChange,
  trigger,
}: {
  student?: Student;
  canManage: boolean;
  upgradeMessage: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const create = useCreateStudent();
  const update = useUpdateStudent(student?.student_id ?? "");
  const uploadPhoto = useUploadMedia();
  const [pendingPhoto, setPendingPhoto] = React.useState<File | null>(null);
  const defaultValues = React.useMemo<StudentForm>(
    () => ({
      nis: student?.nis ?? "",
      nisn: student?.nisn ?? "",
      nik: student?.nik ?? "",
      full_name: student?.full_name ?? "",
      gender: (student?.gender as StudentForm["gender"]) ?? "male",
      birth_date: student?.birth_date ?? "",
      birth_place: student?.birth_place ?? "",
      religion: student?.religion ?? "",
      nationality: student?.nationality ?? "Indonesia",
      address_line: student?.address_line ?? "",
      phone_number: student?.phone_number ?? "",
      origin_school: student?.origin_school ?? "",
      entry_date: student?.entry_date ?? "",
    }),
    [student],
  );
  const form = useForm<StudentForm>({ resolver: zodResolver(studentSchema), defaultValues });

  React.useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form, isOpen]);

  const loading = create.isPending || update.isPending || uploadPhoto.isPending;

  async function onSubmit(values: StudentForm) {
    const payload = values.entry_date === "" ? { ...values, entry_date: undefined } : values;
    try {
      if (student) {
        await update.mutateAsync(payload);
        toast.success("Siswa diperbarui.");
      } else {
        const created = await create.mutateAsync(payload);
        if (pendingPhoto) {
          await uploadPhoto.mutateAsync({ ownerType: "student", ownerId: created.student_id, file: pendingPhoto });
          setPendingPhoto(null);
        }
        toast.success("Siswa ditambahkan.");
      }
      setOpen(false);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan siswa." }));
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student ? "Edit siswa" : "Tambah siswa"}</DialogTitle>
          <DialogDescription>NIS unik per sekolah. Gender harus salah satu dari opsi.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelRequired>NIS</FormLabelRequired>
                    <FormControl>
                      <Input {...field} placeholder="S-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nisn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NISN</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1234567890" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabelRequired>Nama lengkap</FormLabelRequired>
                  <FormControl>
                    <Input {...field} placeholder="Budi Santoso" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="birth_place"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelRequired>Tempat lahir</FormLabelRequired>
                    <FormControl>
                      <Input {...field} placeholder="Jakarta" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelRequired>Tanggal lahir</FormLabelRequired>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
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
                    <FormLabelRequired>Jenis kelamin</FormLabelRequired>
                    <Select value={field.value ?? ""} onValueChange={(value) => field.onChange(value as "male" | "female")}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih gender" />
                        </SelectTrigger>
                      </FormControl>
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
                name="religion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agama</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih agama" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="islam">Islam</SelectItem>
                        <SelectItem value="kristen">Kristen</SelectItem>
                        <SelectItem value="katolik">Katolik</SelectItem>
                        <SelectItem value="hindu">Hindu</SelectItem>
                        <SelectItem value="buddha">Buddha</SelectItem>
                        <SelectItem value="konghucu">Konghucu</SelectItem>
                        <SelectItem value="lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kewarganegaraan</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Indonesia" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
              <FormLabel>Foto siswa</FormLabel>
              {student ? (
                <PhotoUpload ownerType="student" ownerId={student.student_id} disabled={!canManage} />
              ) : (
                <>
                  <FileDropzone
                    value={pendingPhoto}
                    onChange={setPendingPhoto}
                    accept={IMAGE_ACCEPT}
                    maxSize={MAX_IMAGE_SELECT_SIZE_BYTES}
                    prompt="Tarik foto ke sini atau klik untuk memilih"
                    hint={`${IMAGE_SIZE_HINT} Foto diunggah setelah siswa disimpan.`}
                  />
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="entry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal masuk</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pilih tanggal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="origin_school"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asal sekolah</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="SD Negeri 1" />
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

function ArchiveStudentDialog({
  student,
  canManage: _canManage,
  open,
  onOpenChange,
}: {
  student: Student;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const archive = useArchiveStudent();
  const [reason, setReason] = React.useState("");

  async function onArchive() {
    try {
      await archive.mutateAsync({ studentId: student.student_id, reason });
      toast.success("Siswa berhasil diarsipkan");
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal mengarsipkan siswa" }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Arsipkan Siswa</DialogTitle>
          <DialogDescription>
            Arsipkan {student.full_name}? Data siswa akan disembunyikan dari daftar aktif tetapi tetap tersimpan untuk keperluan historis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <FormField
            control={{} as Control<FieldValues>}
            name="reason"
            render={() => (
              <FormItem>
                <FormLabelRequired>Alasan arsip</FormLabelRequired>
                <Select value={reason} onValueChange={(value) => setReason(value as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih alasan" />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_ARCHIVE_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={!reason || archive.isPending}
            onClick={onArchive}
          >
            {archive.isPending ? "Mengarsipkan..." : "Arsipkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function genderLabel(gender: string) {
  if (gender === "male") return "Laki-laki";
  if (gender === "female") return "Perempuan";
  return gender;
}

function UnlinkStudentAccountDialog({
  student,
  open,
  onOpenChange,
}: {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const unlink = useUnlinkStudentAccount();

  async function onConfirm() {
    try {
      await unlink.mutateAsync({ studentId: student.student_id });
      toast.success("Akun siswa diputus.");
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa memutus akun." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Putuskan akun — ${student.full_name}?`}
      description="Siswa tidak bisa melihat rapor setelah akun diputus. Hubungkan ulang kapan saja melalui menu Hubungkan akun."
      confirmLabel="Putuskan"
      loadingLabel="Memutus..."
      loading={unlink.isPending}
      destructive
      canConfirm
      onConfirm={onConfirm}
    />
  );
}

function LinkAccountDialog({
  student,
  canManage,
  open,
  onOpenChange,
}: {
  student: Student;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const link = useLinkStudentAccount();
  const [userId, setUserId] = React.useState(student.user_id ?? "");
  const [search, setSearch] = React.useState("");

  const users = useTenantUsers(
    React.useMemo(
      () => ({ search, page: 1, page_size: 50, sort: "name" as const }),
      [search],
    ),
  );

  const studentUsers = React.useMemo(
    () => (users.data?.data ?? []).filter((u) => u.roles.includes("student")),
    [users.data],
  );

  React.useEffect(() => {
    setUserId(student.user_id ?? "");
  }, [student]);

  async function onConfirm() {
    if (!userId) return;
    try {
      await link.mutateAsync({ studentId: student.student_id, userId });
      toast.success("Akun siswa terhubung.");
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghubungkan akun." }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hubungkan akun — {student.full_name}</DialogTitle>
          <DialogDescription>
            Pilih akun pengguna bertipe siswa untuk menghubungkan dengan profil siswa ini.
          </DialogDescription>
        </DialogHeader>
        <Combobox
          searchable
          items={studentUsers}
          isLoading={users.isLoading}
          isSearchLoading={users.isFetching}
          value={userId}
          onValueChange={setUserId}
          getOptionValue={(user) => user.user_id}
          getOptionLabel={(user) => `${user.full_name} (${user.email ?? user.username})`}
          placeholder="Pilih akun siswa"
          searchPlaceholder="Cari akun siswa..."
          emptyText="Belum ada akun siswa"
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

function GuardiansManagerDialog({
  student,
  usersList,
  usersLoading,
  canManage,
  open,
  onOpenChange,
}: {
  student: Student;
  usersList: TenantUser[];
  usersLoading: boolean;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const guardiansQuery = useStudentGuardians(student.student_id);
  const linkGuardian = useLinkGuardian();
  const unlinkGuardian = useUnlinkGuardian();
  const [selectedUserId, setSelectedUserId] = React.useState("");

  const availableUsers = React.useMemo(() => {
    const linkedUserIds = new Set(guardiansQuery.data?.map((g) => g.user_id) ?? []);
    return usersList.filter(
      (user) =>
        (user.roles.includes("parent") || user.roles.includes("guardian")) &&
        !linkedUserIds.has(user.user_id)
    );
  }, [usersList, guardiansQuery.data]);

  async function onAdd() {
    if (!selectedUserId) return;
    try {
      await linkGuardian.mutateAsync({ studentId: student.student_id, userId: selectedUserId });
      toast.success("Wali murid berhasil ditambahkan.");
      setSelectedUserId("");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menambahkan wali murid." }));
    }
  }

  async function onRemove(userId: string) {
    try {
      await unlinkGuardian.mutateAsync({ studentId: student.student_id, userId });
      toast.success("Wali murid berhasil dihapus.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus wali murid." }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wali Murid — {student.full_name}</DialogTitle>
          <DialogDescription>
            Hubungkan satu atau beberapa akun wali (parent/guardian) ke siswa ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Daftar Wali Terhubung</h4>
            {guardiansQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : guardiansQuery.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada wali terhubung.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {guardiansQuery.data?.map((guardian) => {
                  const user = usersList.find((u) => u.user_id === guardian.user_id);
                  const name = user ? user.full_name : `User #${guardian.user_id.slice(-4)}`;
                  const email = user?.email ?? user?.username ?? "";
                  return (
                    <div
                      key={guardian.user_id}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium">{name}</div>
                        {email && <div className="text-xs text-muted-foreground">{email}</div>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canManage || unlinkGuardian.isPending}
                        onClick={() => onRemove(guardian.user_id)}
                        className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        Hapus
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {canManage && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-semibold">Tautkan Wali Baru</h4>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    items={availableUsers}
                    isLoading={usersLoading}
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    getOptionValue={(user) => user.user_id}
                    getOptionLabel={(user) => `${user.full_name} (${user.email ?? user.username})`}
                    placeholder="Pilih akun wali murid"
                    emptyText="Tidak ada akun wali yang tersedia"
                    popoverModal
                  />
                </div>
                <Button
                  disabled={!selectedUserId || linkGuardian.isPending}
                  loading={linkGuardian.isPending}
                  onClick={onAdd}
                >
                  Tambah
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
