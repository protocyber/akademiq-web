"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { MultiSelect } from "@/components/ui/multi-select";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { GuardedButton, TableSkeleton, type OpsContext } from "@/components/features/academic-ops/academic-ops-page";
import { getErrorMessage } from "@/lib/errors/messages";
import {
  useBulkAssignTeaching,
  useBulkDeleteAssignments,
  useDeleteAssignment,
} from "@/lib/query/mutations/use-academic-ops";
import {
  useHomerooms,
  useTeachers,
  useTeachingAssignmentsTable,
  type TeachingAssignment,
} from "@/lib/query/queries/use-academic-ops";
import {
  useSubjects,
  useSubjectsForYear,
} from "@/lib/query/queries/use-academic-config";
import { bulkTeachingAssignmentSchema, type BulkTeachingAssignmentForm } from "@/lib/schemas/academic-ops";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import {
  parseTeachingAssignmentsParams,
  serializeTeachingAssignmentsParams,
  type TeachingAssignmentsParams,
} from "@/lib/schemas/teaching-assignments-params";
import { useSelectWithinPage } from "@/lib/data-table/use-select-within-page";

export function TeachingAssignmentsScreen({ canManage, upgradeMessage }: OpsContext) {
  const { yearId } = useAcademicScope();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => {
    const p = parseTeachingAssignmentsParams(searchParams);
    return { ...p, academic_year_id: yearId || undefined };
  }, [searchParams, yearId]);
  const assignments = useTeachingAssignmentsTable(params);
  const homerooms = useHomerooms();
  const subjects = useSubjectsForYear(yearId ?? undefined);
  const filteredHomerooms = React.useMemo(
    () =>
      (homerooms.data ?? []).filter(
        (h) => !params.academic_year_id || h.academic_year_id === params.academic_year_id,
      ),
    [homerooms.data, params.academic_year_id],
  );

  const [createOpen, setCreateOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<RowSelectionState>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelected({});
  }, [params.page, params.search, params.sort, params.academic_year_id, params.homeroom_id, params.subject_id]);

  const pageRows = assignments.data?.data ?? [];
  const selectWithinPage = useSelectWithinPage({
    rows: pageRows,
    rowSelection: selected,
    getRowId: (a) => a.assignment_id,
    onRowSelectionChange: setSelected,
    toggleMode: "some",
  });

  const meta = assignments.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 };
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  function onParamsChange(next: TeachingAssignmentsParams) {
    const query = serializeTeachingAssignmentsParams(next);
    router.replace(query ? `/teaching-assignments?${query}` : "/teaching-assignments", { scroll: false });
  }

  if (!yearId) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Silakan pilih tahun ajaran di header untuk melihat penugasan mengajar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <DataTableCard
        title="Penugasan Mengajar"
        description="Assign guru ke mata pelajaran dan kelas untuk tahun ajaran aktif."
        primaryActions={
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Tambah Penugasan
          </Button>
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
                  <DropdownMenuLabel>Aksi untuk {selectedIds.length} penugasan</DropdownMenuLabel>
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
              onChange={(val) => onParamsChange({ ...params, search: val || undefined, page: 1 })}
              debounce={400}
              placeholder="Cari nama guru"
              className="min-w-[160px] sm:flex-1 lg:flex-1"
            />
          ),
          filters: (
            <div className="flex flex-wrap gap-2">
              <Select
                value={params.subject_id ?? "all"}
                onValueChange={(value) =>
                  onParamsChange({ ...params, subject_id: value === "all" ? undefined : value, page: 1 })
                }
              >
                <SelectTrigger className="w-full sm:w-[10rem]">
                  <SelectValue placeholder="Mata pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua mapel</SelectItem>
                  {(subjects.data ?? []).map((subject) => (
                    <SelectItem key={subject.subject_id} value={subject.subject_id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={params.homeroom_id ?? "all"}
                onValueChange={(value) =>
                  onParamsChange({ ...params, homeroom_id: value === "all" ? undefined : value, page: 1 })
                }
              >
                <SelectTrigger className="w-full sm:w-[10rem]">
                  <SelectValue placeholder="Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kelas</SelectItem>
                  {filteredHomerooms.map((homeroom) => (
                    <SelectItem key={homeroom.homeroom_id} value={homeroom.homeroom_id}>
                      {homeroom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ),
        }}
        pagination={{
          page: meta.page,
          pageCount,
          total: meta.total,
          label: "penugasan",
          onPrev: () => onParamsChange({ ...params, page: meta.page - 1 }),
          onNext: () => onParamsChange({ ...params, page: meta.page + 1 }),
        }}
      >
        {assignments.isLoading ? (
          <div className="px-4"><TableSkeleton /></div>
        ) : assignments.error ? (
          <p className="px-4 text-sm text-destructive">{getErrorMessage(assignments.error)}</p>
        ) : (
          <AssignmentTable
            assignments={pageRows}
            params={params}
            canManage={canManage}
            rowSelection={selected}
            onRowSelectionChange={setSelected}
            onStartDelete={(id) => { setPendingId(id); setSelected({ [id]: true }); setConfirmDelete(true); }}
            onParamsChange={onParamsChange}
          />
        )}
      </DataTableCard>

      <DeleteConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        ids={pendingId ? [pendingId] : selectedIds}
        onDone={() => { setSelected({}); setPendingId(null); }}
      />

      <AssignmentDialog
        canManage={canManage}
        upgradeMessage={upgradeMessage}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}

function AssignmentTable({
  assignments,
  params,
  canManage,
  rowSelection,
  onRowSelectionChange,
  onStartDelete: _onStartDelete,
  onParamsChange: _onParamsChange,
}: {
  assignments: TeachingAssignment[];
  params: TeachingAssignmentsParams;
  canManage: boolean;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (value: RowSelectionState) => void;
  onStartDelete: (id: string) => void;
  onParamsChange: (params: TeachingAssignmentsParams) => void;
}) {
  const teachers = useTeachers();
  const homerooms = useHomerooms();
  const subjectYearId = params.academic_year_id ?? assignments[0]?.academic_year_id;
  const subjects = useSubjectsForYear(subjectYearId);

  const teacherName = useNameMap(teachers.data ?? [], (t) => t.teacher_id, (t) => t.full_name);
  const homeroomName = useNameMap(homerooms.data ?? [], (h) => h.homeroom_id, (h) => h.name);
  const subjectName = useNameMap(subjects.data ?? [], (s) => s.subject_id, (s) => s.name);

  const columns: ColumnDef<TeachingAssignment>[] = [
    {
      id: "select",
      size: 40,
      header: () => null,
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.assignment_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.assignment_id] = true;
            else delete next[row.original.assignment_id];
            onRowSelectionChange(next);
          }}
          aria-label={`Pilih ${teacherName(row.original.teacher_id)}`}
        />
      ),
    },
    {
      id: "teacher",
      header: () => <span>Guru</span>,
      cell: ({ row }) => <span className="font-medium text-foreground">{teacherName(row.original.teacher_id)}</span>,
    },
    {
      id: "subject",
      header: () => <span>Mapel</span>,
      cell: ({ row }) => <span className="text-muted-foreground">{subjectName(row.original.subject_id)}</span>,
    },
    {
      id: "homeroom",
      header: () => <span>Kelas</span>,
      cell: ({ row }) => <span>{homeroomName(row.original.homeroom_id)}</span>,
    },
    {
      id: "actions",
      size: 72,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="gap-1">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{teacherName(row.original.teacher_id)}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <RowDelete assignmentId={row.original.assignment_id} canManage={canManage} />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={assignments}
      getRowId={(row) => row.assignment_id}
      rowSelection={rowSelection}
      emptyText="Tidak ada penugasan yang cocok."
      classNames={{ wrapper: "rounded-none !border-x-0" }}
    />
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
  const singleDelete = useDeleteAssignment();
  const bulkDelete = useBulkDeleteAssignments();
  const count = ids.length;

  async function onConfirm() {
    try {
      if (count === 1) {
        await singleDelete.mutateAsync(ids[0]);
      } else {
        await bulkDelete.mutateAsync(ids);
      }
      toast.success(`${count} penugasan dihapus.`);
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus penugasan." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${count} penugasan?`}
      description="Penugasan yang dihapus bisa dibuat ulang kapan saja."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={singleDelete.isPending || bulkDelete.isPending}
      destructive
      canConfirm={count > 0}
      onConfirm={onConfirm}
    />
  );
}

function RowDelete({ assignmentId, canManage }: { assignmentId: string; canManage: boolean; }) {
  const del = useDeleteAssignment();
  return (
    <DropdownMenuItem
      disabled={!canManage || del.isPending}
      className="text-destructive focus:text-destructive"
      onClick={async () => {
        try {
          await del.mutateAsync(assignmentId);
          toast.success("Penugasan dihapus.");
        } catch (err) {
          toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus penugasan." }));
        }
      }}
    >
      <Trash2 className="h-4 w-4" /> Hapus
    </DropdownMenuItem>
  );
}

function useNameMap<T>(items: T[], getId: (item: T) => string, getLabel: (item: T) => string) {
  return React.useCallback(
    (id: string) => {
      const map = new Map(items.map((item) => [getId(item), getLabel(item)]));
      return map.get(id) ?? id;
    },
    [items, getId, getLabel],
  );
}

function AssignmentDialog({
  canManage,
  upgradeMessage,
  open,
  onOpenChange,
}: {
  canManage: boolean;
  upgradeMessage: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { yearId, curriculumId } = useAcademicScope();
  const homerooms = useHomerooms();
  const teachers = useTeachers();
  const subjects = useSubjects(curriculumId ?? undefined);

  const form = useForm<BulkTeachingAssignmentForm>({
    resolver: zodResolver(bulkTeachingAssignmentSchema),
    defaultValues: { teacher_ids: [], subject_ids: [], homeroom_ids: [], academic_year_id: yearId || "" },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({ teacher_ids: [], subject_ids: [], homeroom_ids: [], academic_year_id: yearId || "" });
    }
  }, [open, form, yearId]);

  const assign = useBulkAssignTeaching();
  const filteredHomerooms = (homerooms.data ?? []).filter((h) => !yearId || h.academic_year_id === yearId);

  const teacherOptions = React.useMemo(
    () => (teachers.data ?? []).map((t) => ({ value: t.teacher_id, label: t.full_name })),
    [teachers.data],
  );
  const subjectOptions = React.useMemo(
    () => (subjects.data ?? []).map((s) => ({ value: s.subject_id, label: s.name })),
    [subjects.data],
  );
  const homeroomOptions = React.useMemo(
    () => filteredHomerooms.map((h) => ({ value: h.homeroom_id, label: h.name })),
    [filteredHomerooms],
  );

  async function onSubmit(values: BulkTeachingAssignmentForm) {
    if (!yearId) return;
    try {
      const result = await assign.mutateAsync({ ...values, academic_year_id: yearId });
      if (result.skipped > 0) {
        toast.success(`${result.created} penugasan dibuat, ${result.skipped} sudah ada (dilewati).`);
      } else {
        toast.success(`${result.created} penugasan dibuat.`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa membuat penugasan." }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah penugasan</DialogTitle>
          <DialogDescription>Pilih guru, mata pelajaran, lalu kelas.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="teacher_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guru</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={teacherOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={teachers.isLoading ? "Memuat..." : "Pilih guru"}
                      searchPlaceholder="Cari guru..."
                      emptyText="Belum ada guru"
                      disabled={teachers.isLoading || teacherOptions.length === 0}
                      aria-invalid={Boolean(form.formState.errors.teacher_ids)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mata pelajaran</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={subjectOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={subjects.isLoading ? "Memuat..." : "Pilih mata pelajaran"}
                      searchPlaceholder="Cari mata pelajaran..."
                      emptyText="Belum ada mata pelajaran"
                      disabled={subjects.isLoading || subjectOptions.length === 0}
                      aria-invalid={Boolean(form.formState.errors.subject_ids)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="homeroom_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelas</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={homeroomOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={homerooms.isLoading ? "Memuat..." : "Pilih kelas"}
                      searchPlaceholder="Cari kelas..."
                      emptyText="Belum ada kelas"
                      disabled={homerooms.isLoading || homeroomOptions.length === 0}
                      aria-invalid={Boolean(form.formState.errors.homeroom_ids)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <GuardedButton enabled={canManage} message={upgradeMessage} loading={assign.isPending}>
                Assign
              </GuardedButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
