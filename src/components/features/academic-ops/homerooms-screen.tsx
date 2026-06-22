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
import { MultiSelect } from "@/components/ui/multi-select";
import { SearchInput } from "@/components/ui/search-input";
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

const SORT_FIELDS: Record<string, { asc: HomeroomsSort; desc: HomeroomsSort; }> = {
  name: { asc: "name", desc: "-name" },
  grade_level: { asc: "grade_level", desc: "-grade_level" },
};

export function HomeroomsScreen({ canManage, upgradeMessage }: OpsContext) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseHomeroomsParams(searchParams), [searchParams]);
  const homerooms = useHomeroomsTable(params);
  const [selected, setSelected] = React.useState<RowSelectionState>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

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
            <SearchInput
              value={params.search ?? ""}
              onChange={(val) => replaceParams(router, { ...params, search: val || undefined, page: 1 })}
              debounce={400}
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
      id: "enrolled_count",
      header: () => <span>Terisi</span>,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.enrolled_count} / {row.original.capacity}
        </span>
      ),
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
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [unenrollSelection, setUnenrollSelection] = React.useState<Set<string>>(new Set());
  const [rosterSearch, setRosterSearch] = React.useState("");

  const enrollmentList = enrollments.data ?? [];
  const enrolledCount = enrollmentList.length;

  const studentName = React.useMemo(() => {
    const map = new Map((students.data ?? []).map((s) => [s.student_id, s.full_name]));
    return (id: string) => map.get(id) ?? id;
  }, [students.data]);

  const filteredEnrollments = React.useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return enrollmentList;
    return enrollmentList.filter((e) =>
      studentName(e.student_id).toLowerCase().includes(q),
    );
  }, [enrollmentList, rosterSearch, studentName]);

  const allFilteredIds = filteredEnrollments.map((e) => e.enrollment_id);
  const unenrollAllChecked =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => unenrollSelection.has(id));
  const unenrollIndeterminate =
    allFilteredIds.some((id) => unenrollSelection.has(id)) && !unenrollAllChecked;

  function toggleUnenrollAll() {
    if (unenrollAllChecked) {
      setUnenrollSelection((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setUnenrollSelection((prev) => new Set([...prev, ...allFilteredIds]));
    }
  }

  function toggleUnenrollRow(enrollmentId: string) {
    setUnenrollSelection((prev) => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  }

  const enrolledIds = React.useMemo(
    () => new Set(enrollmentList.map((e) => e.student_id)),
    [enrollmentList],
  );
  const availableOptions = React.useMemo(
    () =>
      (students.data ?? [])
        .filter((s) => !enrolledIds.has(s.student_id))
        .map((s) => ({ value: s.student_id, label: s.full_name })),
    [students.data, enrolledIds],
  );

  async function onEnroll() {
    if (selectedIds.length === 0) return;
    const results = await Promise.allSettled(
      selectedIds.map((id) =>
        enroll.mutateAsync({ student_id: id, homeroom_id: homeroom.homeroom_id }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = results.length - failed;
    if (succeeded > 0) {
      toast.success(`${succeeded} siswa dienroll.`);
      setSelectedIds([]);
    }
    if (failed > 0) {
      toast.error(`${failed} siswa gagal dienroll.`);
    }
  }

  async function onBulkUnenroll() {
    const ids = Array.from(unenrollSelection);
    if (ids.length === 0) return;
    const targets = enrollmentList.filter((e) => unenrollSelection.has(e.enrollment_id));
    const results = await Promise.allSettled(
      targets.map((e) => unenroll.mutateAsync(e.enrollment_id)),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = results.length - failed;
    if (succeeded > 0) {
      toast.success(`${succeeded} siswa di-unenroll.`);
      setUnenrollSelection(new Set());
    }
    if (failed > 0) {
      toast.error(`${failed} siswa gagal di-unenroll.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Roster — {homeroom.name}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {enrolledCount} siswa terdaftar
            </span>
          </DialogTitle>
          <DialogDescription>Enroll dan unenroll siswa untuk kelas ini.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-1">
              <MultiSelect
                options={availableOptions}
                value={selectedIds}
                onChange={setSelectedIds}
                placeholder={students.isLoading ? "Memuat..." : "Cari dan pilih siswa"}
                searchPlaceholder="Cari siswa..."
                emptyText="Semua siswa sudah dienroll"
                disabled={!canManage || students.isLoading || availableOptions.length === 0}
              />
            </div>
            <Button
              type="button"
              disabled={!canManage || selectedIds.length === 0 || enroll.isPending}
              loading={enroll.isPending}
              onClick={onEnroll}
            >
              Enroll
            </Button>
          </div>

          <SearchInput
            value={rosterSearch}
            onChange={setRosterSearch}
            placeholder="Cari siswa terdaftar..."
            debounce={350}
          />

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={unenrollAllChecked}
                      data-state={unenrollIndeterminate ? "indeterminate" : undefined}
                      onCheckedChange={toggleUnenrollAll}
                      disabled={!canManage || filteredEnrollments.length === 0}
                      aria-label="Pilih semua"
                    />
                  </TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolledCount === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">
                      Roster kosong.
                    </TableCell>
                  </TableRow>
                ) : filteredEnrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">
                      Tidak ada siswa yang cocok.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrollments.map((enrollment) => (
                    <TableRow
                      key={enrollment.enrollment_id}
                      data-state={unenrollSelection.has(enrollment.enrollment_id) ? "selected" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={unenrollSelection.has(enrollment.enrollment_id)}
                          onCheckedChange={() => toggleUnenrollRow(enrollment.enrollment_id)}
                          disabled={!canManage}
                          aria-label={`Pilih ${studentName(enrollment.student_id)}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{studentName(enrollment.student_id)}</TableCell>
                      <TableCell className="text-muted-foreground">active</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="flex items-center gap-2">
            {unenrollSelection.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">{unenrollSelection.size} dipilih</span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={unenroll.isPending}
                  loading={unenroll.isPending}
                  onClick={onBulkUnenroll}
                >
                  Unenroll Terpilih
                </Button>
              </>
            )}
          </div>
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
