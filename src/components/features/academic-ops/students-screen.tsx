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
  Users,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { ImportDialog } from "@/components/features/academic-ops/import-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { GuardedButton, TableSkeleton, type OpsContext } from "@/components/features/academic-ops/academic-ops-page";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { getErrorMessage } from "@/lib/errors/messages";
import {
  useBulkDeleteStudents,
  useCreateStudent,
  useDeleteStudent,
  useUpdateStudent,
  useLinkStudentAccount,
  useLinkGuardian,
  useUnlinkGuardian,
} from "@/lib/query/mutations/use-academic-ops";
import { useStudentsTable, type Student, useStudentGuardians } from "@/lib/query/queries/use-academic-ops";
import { studentSchema, type StudentForm } from "@/lib/schemas/academic-ops";
import {
  parseStudentsParams,
  serializeStudentsParams,
  type StudentsParams,
  type StudentsSort,
} from "@/lib/schemas/students-params";
import { useTenantUsers, type TenantUser } from "@/lib/query/queries/use-tenant-users";
import { QuerySelect } from "@/components/ui/query-select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const SORT_FIELDS: Record<string, { asc: StudentsSort; desc: StudentsSort }> = {
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
  const [importOpen, setImportOpen] = React.useState(false);

  const studentUsers = React.useMemo(
    () =>
      (users.data?.data ?? []).filter(
        (user) => user.roles.includes("student"),
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
              <CardTitle className="text-lg">Daftar Siswa</CardTitle>
              <CardDescription>Kelola master data siswa dan identitas NIS.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Cari nama atau NIS"
                className="md:w-72"
              />
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> Impor
              </Button>
              <StudentDialog
                canManage={canManage}
                upgradeMessage={upgradeMessage}
                trigger={<Button size="sm">+ Tambah</Button>}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {students.isLoading ? (
            <TableSkeleton />
          ) : students.error ? (
            <p className="text-sm text-destructive">{getErrorMessage(students.error)}</p>
          ) : (
            <StudentsTable
              students={students.data?.data ?? []}
              meta={students.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 }}
              params={params}
              canManage={canManage}
              upgradeMessage={upgradeMessage}
              studentUsers={studentUsers}
              usersList={users.data?.data ?? []}
              usersLoading={users.isLoading}
              onParamsChange={(next) => replaceParams(router, next)}
            />
          )}
        </CardContent>
      </Card>

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

type Meta = { page: number; page_size: number; total: number };

function StudentsTable({
  students,
  meta,
  params,
  canManage,
  upgradeMessage,
  studentUsers,
  usersList,
  usersLoading,
  onParamsChange,
}: {
  students: Student[];
  meta: Meta;
  params: StudentsParams;
  canManage: boolean;
  upgradeMessage: string;
  studentUsers: TenantUser[];
  usersList: TenantUser[];
  usersLoading: boolean;
  onParamsChange: (params: StudentsParams) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [editing, setEditing] = React.useState<Student | null>(null);
  const [linking, setLinking] = React.useState<Student | null>(null);
  const [managingGuardians, setManagingGuardians] = React.useState<Student | null>(null);
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
  const allSelected = students.length > 0 && students.every((s) => rowSelection[s.student_id]);
  const someSelected = students.some((s) => rowSelection[s.student_id]);

  function startDelete(id: string) {
    setPendingId(id);
    setRowSelection({ [id]: true });
    setConfirmDelete(true);
  }

  const columns: ColumnDef<Student>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            students.forEach((s) => {
              if (checked) next[s.student_id] = true;
              else delete next[s.student_id];
            });
            setRowSelection(next);
          }}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.student_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.student_id] = true;
            else delete next[row.original.student_id];
            setRowSelection(next);
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
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.birth_date}</span>,
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
        const student = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <MoreHorizontal className="h-4 w-4" /> Aksi
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{student.full_name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!canManage} onClick={() => setEditing(student)}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canManage} onClick={() => setLinking(student)}>
                <LinkIcon className="h-4 w-4" /> Hubungkan akun
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canManage} onClick={() => setManagingGuardians(student)}>
                <Users className="h-4 w-4" /> Wali murid
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canManage}
                className="text-destructive focus:text-destructive"
                onClick={() => startDelete(student.student_id)}
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
        data={students}
        getRowId={(row) => row.student_id}
        rowSelection={rowSelection}
        emptyText="Tidak ada siswa yang cocok."
      />

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Halaman {meta.page} dari {pageCount} · {meta.total} siswa
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
        <StudentDialog
          student={editing}
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
          student={linking}
          studentUsers={studentUsers}
          usersLoading={usersLoading}
          canManage={canManage}
          open={Boolean(linking)}
          onOpenChange={(open) => {
            if (!open) setLinking(null);
          }}
        />
      ) : null}

      {managingGuardians ? (
        <GuardiansManagerDialog
          student={managingGuardians}
          usersList={usersList}
          usersLoading={usersLoading}
          canManage={canManage}
          open={Boolean(managingGuardians)}
          onOpenChange={(open) => {
            if (!open) setManagingGuardians(null);
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
  const defaultValues = React.useMemo<StudentForm>(
    () => ({
      nis: student?.nis ?? "",
      full_name: student?.full_name ?? "",
      gender: (student?.gender as StudentForm["gender"]) ?? "female",
      birth_date: student?.birth_date ?? "",
    }),
    [student],
  );
  const form = useForm<StudentForm>({ resolver: zodResolver(studentSchema), defaultValues });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const loading = create.isPending || update.isPending;

  async function onSubmit(values: StudentForm) {
    try {
      if (student) {
        await update.mutateAsync(values);
        toast.success("Siswa diperbarui.");
      } else {
        await create.mutateAsync(values);
        toast.success("Siswa ditambahkan.");
        form.reset({ nis: "", full_name: "", gender: "female", birth_date: "" });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student ? "Edit siswa" : "Tambah siswa"}</DialogTitle>
          <DialogDescription>NIS unik per tenant. Gender harus salah satu dari opsi.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="nis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIS</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="S-001" />
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
                    <Input {...field} placeholder="Budi Santoso" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
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
                    <DatePicker value={field.value} onChange={field.onChange} />
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

function genderLabel(gender: string) {
  if (gender === "male") return "Laki-laki";
  if (gender === "female") return "Perempuan";
  return "Lainnya";
}

function LinkAccountDialog({
  student,
  studentUsers,
  usersLoading,
  canManage,
  open,
  onOpenChange,
}: {
  student: Student;
  studentUsers: TenantUser[];
  usersLoading: boolean;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const link = useLinkStudentAccount();
  const [userId, setUserId] = React.useState(student.user_id ?? "");

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
        <QuerySelect
          items={studentUsers}
          isLoading={usersLoading}
          value={userId}
          onValueChange={setUserId}
          getValue={(user) => user.user_id}
          getLabel={(user) => `${user.full_name} (${user.email ?? user.username})`}
          placeholder="Pilih akun siswa"
          emptyText="Belum ada akun siswa"
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
                  <QuerySelect
                    items={availableUsers}
                    isLoading={usersLoading}
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    getValue={(user) => user.user_id}
                    getLabel={(user) => `${user.full_name} (${user.email ?? user.username})`}
                    placeholder="Pilih akun wali murid"
                    emptyText="Tidak ada akun wali yang tersedia"
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
