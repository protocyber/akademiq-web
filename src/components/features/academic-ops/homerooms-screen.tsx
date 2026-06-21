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
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { QuerySelect } from "@/components/ui/query-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { GuardedButton, TableSkeleton, type OpsContext } from "@/components/features/academic-ops/academic-ops-page";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { getErrorMessage } from "@/lib/errors/messages";
import {
  useBulkDeleteHomerooms,
  useCreateHomeroom,
  useDeleteHomeroom,
  useEnrollStudent,
  useUnenrollStudent,
  useUpdateHomeroom,
} from "@/lib/query/mutations/use-academic-ops";
import {
  useHomeroomEnrollments,
  useHomeroomsTable,
  useStudents,
  type Enrollment,
  type Homeroom,
} from "@/lib/query/queries/use-academic-ops";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import { homeroomSchema, type HomeroomForm } from "@/lib/schemas/academic-ops";
import {
  parseHomeroomsParams,
  serializeHomeroomsParams,
  type HomeroomsParams,
  type HomeroomsSort,
} from "@/lib/schemas/homerooms-params";
import { useSelectWithinPage } from "@/lib/data-table/use-select-within-page";

const SORT_FIELDS: Record<string, { asc: HomeroomsSort; desc: HomeroomsSort }> = {
  name: { asc: "name", desc: "-name" },
  grade_level: { asc: "grade_level", desc: "-grade_level" },
};

export function HomeroomsScreen({ canManage, upgradeMessage }: OpsContext) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseHomeroomsParams(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");
  const homerooms = useHomeroomsTable(params);
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

  const pageRows = homerooms.data?.data ?? [];
  const selectWithinPage = useSelectWithinPage({
    rows: pageRows,
    rowSelection: selected,
    getRowId: (h) => h.homeroom_id,
    onRowSelectionChange: setSelected,
    toggleMode: "some",
  });

  const meta = homerooms.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 };
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  return (
    <div className="space-y-4">
      <DataTableCard
        title="Daftar Kelas"
        description="Buat homeroom, lihat roster, dan enroll siswa."
        primaryActions={
          <HomeroomDialog
            canManage={canManage}
            upgradeMessage={upgradeMessage}
            trigger={<Button size="sm">+ Tambah</Button>}
          />
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
                  <DropdownMenuLabel>Aksi untuk {selectedIds.length} kelas</DropdownMenuLabel>
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
              placeholder="Cari nama atau tingkat"
              className="min-w-[160px] sm:flex-1 lg:flex-1"
            />
          ),
        }}
        pagination={{
          page: meta.page,
          pageCount,
          total: meta.total,
          label: "kelas",
          onPrev: () => replaceParams(router, { ...params, page: meta.page - 1 }),
          onNext: () => replaceParams(router, { ...params, page: meta.page + 1 }),
        }}
      >
        {homerooms.isLoading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : homerooms.error ? (
          <p className="px-4 text-sm text-destructive">{getErrorMessage(homerooms.error)}</p>
        ) : (
          <HomeroomsTable
            homerooms={pageRows}
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
    </div>
  );
}

function replaceParams(router: ReturnType<typeof useRouter>, params: HomeroomsParams) {
  const query = serializeHomeroomsParams(params);
  router.replace(query ? `/homerooms?${query}` : "/homerooms", { scroll: false });
}

function HomeroomsTable({
  homerooms,
  params,
  canManage,
  upgradeMessage,
  rowSelection,
  onRowSelectionChange,
  onStartDelete,
  onParamsChange,
}: {
  homerooms: Homeroom[];
  params: HomeroomsParams;
  canManage: boolean;
  upgradeMessage: string;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (value: RowSelectionState) => void;
  onStartDelete: (id: string) => void;
  onParamsChange: (params: HomeroomsParams) => void;
}) {
  const [editing, setEditing] = React.useState<Homeroom | null>(null);
  const [roster, setRoster] = React.useState<Homeroom | null>(null);

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

  const columns: ColumnDef<Homeroom>[] = [
    {
      id: "select",
      size: 40,
      header: () => null,
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.homeroom_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.homeroom_id] = true;
            else delete next[row.original.homeroom_id];
            onRowSelectionChange(next);
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
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      id: "grade_level",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3 gap-1" onClick={() => toggleSort("grade_level")}>
          Tingkat {sortIcon("grade_level")}
        </Button>
      ),
      cell: ({ row }) => <span className="tabular-nums">{row.original.grade_level}</span>,
    },
    {
      id: "capacity",
      header: () => <span>Kapasitas</span>,
      cell: ({ row }) => <span className="tabular-nums">{row.original.capacity}</span>,
    },
    {
      id: "roster",
      size: 110,
      header: () => <span className="sr-only">Roster</span>,
      cell: ({ row }) => (
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setRoster(row.original)}>
          <Users className="h-4 w-4" /> Roster
        </Button>
      ),
    },
    {
      id: "actions",
      size: 120,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const homeroom = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit" disabled={!canManage} onClick={() => setEditing(homeroom)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canManage} aria-label="Aksi lainnya">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{homeroom.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!canManage}
                  className="text-destructive focus:text-destructive"
                  onClick={() => onStartDelete(homeroom.homeroom_id)}
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
        data={homerooms}
        getRowId={(row) => row.homeroom_id}
        rowSelection={rowSelection}
        emptyText="Tidak ada kelas yang cocok."
        classNames={{ wrapper: "rounded-none !border-x-0" }}
      />

      {editing ? (
        <HomeroomDialog
          homeroom={editing}
          canManage={canManage}
          upgradeMessage={upgradeMessage}
          open={Boolean(editing)}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
        />
      ) : null}

      {roster ? (
        <RosterDialog
          homeroom={roster}
          canManage={canManage}
          open={Boolean(roster)}
          onOpenChange={(open) => { if (!open) setRoster(null); }}
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
  const singleDelete = useDeleteHomeroom();
  const bulkDelete = useBulkDeleteHomerooms();
  const count = ids.length;

  async function onConfirm() {
    try {
      if (count === 1) {
        await singleDelete.mutateAsync(ids[0]);
      } else {
        await bulkDelete.mutateAsync(ids);
      }
      toast.success(`${count} kelas dihapus.`);
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus kelas." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${count} kelas?`}
      description="Kelas yang masih memiliki siswa aktif tidak bisa dihapus."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={singleDelete.isPending || bulkDelete.isPending}
      destructive
      canConfirm={count > 0}
      onConfirm={onConfirm}
    />
  );
}

function RosterDialog({
  homeroom,
  canManage,
  open,
  onOpenChange,
}: {
  homeroom: Homeroom;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const enrollments = useHomeroomEnrollments(homeroom.homeroom_id);
  const students = useStudents();
  const enroll = useEnrollStudent(homeroom.homeroom_id);
  const unenroll = useUnenrollStudent(homeroom.homeroom_id);
  const [studentId, setStudentId] = React.useState("");

  const studentName = React.useMemo(() => {
    const map = new Map((students.data ?? []).map((s) => [s.student_id, s.full_name]));
    return (id: string) => map.get(id) ?? id;
  }, [students.data]);

  const enrolledIds = React.useMemo(
    () => new Set((enrollments.data ?? []).map((e) => e.student_id)),
    [enrollments.data],
  );
  const availableStudents = React.useMemo(
    () => (students.data ?? []).filter((s) => !enrolledIds.has(s.student_id)),
    [students.data, enrolledIds],
  );

  async function onEnroll() {
    if (!studentId) return;
    try {
      await enroll.mutateAsync({ student_id: studentId, homeroom_id: homeroom.homeroom_id });
      toast.success("Siswa dienroll.");
      setStudentId("");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa mengenroll siswa." }));
    }
  }

  async function onUnenroll(enrollment: Enrollment) {
    try {
      await unenroll.mutateAsync(enrollment.enrollment_id);
      toast.success("Siswa di-unenroll.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa meng-unenroll siswa." }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Roster — {homeroom.name}</DialogTitle>
          <DialogDescription>Enroll dan unenroll siswa untuk kelas ini.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-1">
              <QuerySelect
                items={availableStudents}
                isLoading={students.isLoading}
                value={studentId}
                onValueChange={setStudentId}
                getValue={(s) => s.student_id}
                getLabel={(s) => s.full_name}
                placeholder="Pilih siswa"
                emptyText="Semua siswa sudah dienroll"
              />
            </div>
            <Button
              type="button"
              disabled={!canManage || !studentId || enroll.isPending}
              loading={enroll.isPending}
              onClick={onEnroll}
            >
              Enroll
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(enrollments.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">
                      Roster kosong.
                    </TableCell>
                  </TableRow>
                ) : (
                  (enrollments.data ?? []).map((enrollment) => (
                    <TableRow key={enrollment.enrollment_id}>
                      <TableCell className="font-medium">{studentName(enrollment.student_id)}</TableCell>
                      <TableCell className="text-muted-foreground">active</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canManage || unenroll.isPending}
                          onClick={() => onUnenroll(enrollment)}
                        >
                          Unenroll
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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

function HomeroomDialog({
  homeroom,
  canManage,
  upgradeMessage,
  open,
  onOpenChange,
  trigger,
}: {
  homeroom?: Homeroom;
  canManage: boolean;
  upgradeMessage: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const { yearId } = useAcademicScope();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const create = useCreateHomeroom();
  const update = useUpdateHomeroom(homeroom?.homeroom_id ?? "");
  const defaultValues = React.useMemo<HomeroomForm>(
    () => ({
      name: homeroom?.name ?? "",
      grade_level: homeroom?.grade_level ?? "",
      capacity: homeroom?.capacity ?? 32,
      academic_year_id: homeroom?.academic_year_id ?? yearId ?? "",
    }),
    [homeroom, yearId],
  );
  const form = useForm<HomeroomForm>({ resolver: zodResolver(homeroomSchema), defaultValues });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const loading = create.isPending || update.isPending;

  async function onSubmit(values: HomeroomForm) {
    if (!homeroom && !yearId) {
      toast.error("Tahun ajaran belum dipilih di header.");
      return;
    }
    try {
      if (homeroom) {
        await update.mutateAsync({
          name: values.name,
          grade_level: values.grade_level,
          capacity: values.capacity,
        });
        toast.success("Kelas diperbarui.");
      } else {
        await create.mutateAsync({
          ...values,
          academic_year_id: yearId!,
        });
        toast.success("Kelas dibuat.");
        form.reset({ name: "", grade_level: "", capacity: 32, academic_year_id: yearId ?? "" });
      }
      setOpen(false);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan kelas." }));
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{homeroom ? "Edit kelas" : "Tambah kelas"}</DialogTitle>
          <DialogDescription>
            {homeroom ? "Tahun ajaran tidak bisa diubah setelah kelas dibuat." : "Kelas hanya bisa dibuat untuk tahun ajaran aktif."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama kelas</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="7A" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grade_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tingkat</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="7" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kapasitas</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <GuardedButton enabled={canManage} message={upgradeMessage} loading={loading}>
                {homeroom ? "Simpan" : "Buat Kelas"}
              </GuardedButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
