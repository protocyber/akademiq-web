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
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { QuerySelect } from "@/components/ui/query-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { GuardedButton, TableSkeleton, type OpsContext } from "@/components/features/academic-ops/academic-ops-page";
import { getErrorMessage } from "@/lib/errors/messages";
import {
  useAssignTeaching,
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
  useAcademicYears,
  useCurriculumVersions,
  useSubjects,
  useSubjectsForYear,
} from "@/lib/query/queries/use-academic-config";
import { teachingAssignmentSchema, type TeachingAssignmentForm } from "@/lib/schemas/academic-ops";
import {
  parseTeachingAssignmentsParams,
  serializeTeachingAssignmentsParams,
  type TeachingAssignmentsParams,
} from "@/lib/schemas/teaching-assignments-params";

export function TeachingAssignmentsScreen({ canManage, upgradeMessage }: OpsContext) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseTeachingAssignmentsParams(searchParams), [searchParams]);
  const assignments = useTeachingAssignmentsTable(params);

  const years = useAcademicYears();
  const activeYears = React.useMemo(() => (years.data ?? []).filter((y) => y.status === "Active"), [years.data]);
  const [createOpen, setCreateOpen] = React.useState(false);

  function onParamsChange(next: TeachingAssignmentsParams) {
    const query = serializeTeachingAssignmentsParams(next);
    router.replace(query ? `/teaching-assignments?${query}` : "/teaching-assignments", {
      scroll: false,
    });
  }

  return (
    <div className="space-y-4">
      <AssignmentFilters
        params={params}
        years={activeYears}
        onParamsChange={onParamsChange}
        extras={
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Tambah Penugasan
          </Button>
        }
      />

      {assignments.isLoading ? (
        <TableSkeleton />
      ) : assignments.error ? (
        <p className="text-sm text-destructive">{getErrorMessage(assignments.error)}</p>
      ) : (
        <AssignmentTable
          assignments={assignments.data?.data ?? []}
          meta={assignments.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 }}
          params={params}
          canManage={canManage}
          onParamsChange={onParamsChange}
        />
      )}

      <AssignmentDialog
        canManage={canManage}
        upgradeMessage={upgradeMessage}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}

function AssignmentFilters({
  params,
  years,
  onParamsChange,
  extras,
}: {
  params: TeachingAssignmentsParams;
  years: { academic_year_id: string; name: string }[];
  onParamsChange: (params: TeachingAssignmentsParams) => void;
  extras: React.ReactNode;
}) {
  const homerooms = useHomerooms();
  const filteredHomerooms = React.useMemo(
    () =>
      (homerooms.data ?? []).filter(
        (h) => !params.academic_year_id || h.academic_year_id === params.academic_year_id,
      ),
    [homerooms.data, params.academic_year_id],
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        <Select
          value={params.academic_year_id ?? "all"}
          onValueChange={(value) =>
            onParamsChange({
              ...params,
              academic_year_id: value === "all" ? undefined : value,
              homeroom_id: undefined,
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-[10rem]">
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tahun</SelectItem>
            {years.map((year) => (
              <SelectItem key={year.academic_year_id} value={year.academic_year_id}>
                {year.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={params.homeroom_id ?? "all"}
          onValueChange={(value) =>
            onParamsChange({
              ...params,
              homeroom_id: value === "all" ? undefined : value,
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-[10rem]">
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
      {extras}
    </div>
  );
}

type Meta = { page: number; page_size: number; total: number };

function AssignmentTable({
  assignments,
  meta,
  params,
  canManage,
  onParamsChange,
}: {
  assignments: TeachingAssignment[];
  meta: Meta;
  params: TeachingAssignmentsParams;
  canManage: boolean;
  onParamsChange: (params: TeachingAssignmentsParams) => void;
}) {
  const teachers = useTeachers();
  const homerooms = useHomerooms();
  const years = useAcademicYears();
  // Subjects are nested under curriculum versions; resolve names across all of
  // the selected year's curricula so the Mapel column shows names, not ids.
  const subjectYearId = params.academic_year_id ?? assignments[0]?.academic_year_id;
  const subjects = useSubjectsForYear(subjectYearId);
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRowSelection({});
  }, [params.page, params.search, params.sort, params.academic_year_id, params.homeroom_id]);

  const teacherName = useNameMap(teachers.data ?? [], (t) => t.teacher_id, (t) => t.full_name);
  const homeroomName = useNameMap(homerooms.data ?? [], (h) => h.homeroom_id, (h) => h.name);
  const yearName = useNameMap(years.data ?? [], (y) => y.academic_year_id, (y) => y.name);
  const subjectName = useNameMap(subjects.data ?? [], (s) => s.subject_id, (s) => s.name);

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const allSelected = assignments.length > 0 && assignments.every((a) => rowSelection[a.assignment_id]);
  const someSelected = assignments.some((a) => rowSelection[a.assignment_id]);

  function startDelete(id: string) {
    setPendingId(id);
    setRowSelection({ [id]: true });
    setConfirmDelete(true);
  }

  const columns: ColumnDef<TeachingAssignment>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            assignments.forEach((a) => {
              if (checked) next[a.assignment_id] = true;
              else delete next[a.assignment_id];
            });
            setRowSelection(next);
          }}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.assignment_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.assignment_id] = true;
            else delete next[row.original.assignment_id];
            setRowSelection(next);
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
      id: "year",
      header: () => <span>Tahun</span>,
      cell: ({ row }) => <span className="text-muted-foreground">{yearName(row.original.academic_year_id)}</span>,
    },
    {
      id: "actions",
      size: 72,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <MoreHorizontal className="h-4 w-4" /> Aksi
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
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
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
            data={assignments}
            getRowId={(row) => row.assignment_id}
            rowSelection={rowSelection}
            emptyText="Tidak ada penugasan yang cocok."
          />

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Halaman {meta.page} dari {pageCount} · {meta.total} penugasan
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
        </CardContent>
      </Card>

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

function RowDelete({ assignmentId, canManage }: { assignmentId: string; canManage: boolean }) {
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
  const years = useAcademicYears();
  const homerooms = useHomerooms();
  const teachers = useTeachers();
  const activeYears = React.useMemo(() => (years.data ?? []).filter((y) => y.status === "Active"), [years.data]);

  const [yearId, setYearId] = React.useState("");
  const [curriculumId, setCurriculumId] = React.useState("");
  const curriculum = useCurriculumVersions(yearId);
  const subjects = useSubjects(curriculumId);

  const form = useForm<TeachingAssignmentForm>({
    resolver: zodResolver(teachingAssignmentSchema),
    defaultValues: { teacher_id: "", subject_id: "", homeroom_id: "", academic_year_id: "" },
  });

  React.useEffect(() => {
    if (!open) {
      setYearId("");
      setCurriculumId("");
      form.reset({ teacher_id: "", subject_id: "", homeroom_id: "", academic_year_id: "" });
    }
  }, [open, form]);

  function onYearChange(id: string) {
    setYearId(id);
    setCurriculumId("");
    form.setValue("academic_year_id", id);
    form.setValue("homeroom_id", "");
    form.setValue("subject_id", "");
  }
  function onCurriculumChange(id: string) {
    setCurriculumId(id);
    form.setValue("subject_id", "");
  }

  const assign = useAssignTeaching();
  const filteredHomerooms = (homerooms.data ?? []).filter((h) => !yearId || h.academic_year_id === yearId);

  async function onSubmit(values: TeachingAssignmentForm) {
    try {
      await assign.mutateAsync(values);
      toast.success("Penugasan dibuat.");
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
          <DialogDescription>Pilih tahun, kurikulum, kelas, guru, lalu mata pelajaran.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <FormField
              control={form.control}
              name="academic_year_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tahun</FormLabel>
                  <QuerySelect
                    items={activeYears}
                    isLoading={years.isLoading}
                    value={field.value}
                    onValueChange={onYearChange}
                    getValue={(y) => y.academic_year_id}
                    getLabel={(y) => y.name}
                    placeholder="Pilih tahun"
                    emptyText="Tidak ada tahun aktif"
                  />
                </FormItem>
              )}
            />
            <div className="space-y-1.5">
              <FormLabel>Kurikulum</FormLabel>
              <QuerySelect
                items={curriculum.data ?? []}
                isLoading={curriculum.isLoading}
                value={curriculumId}
                onValueChange={onCurriculumChange}
                getValue={(c) => c.curriculum_version_id}
                getLabel={(c) => c.name}
                placeholder="Pilih kurikulum"
                emptyText="Belum ada kurikulum"
              />
            </div>
            <FormField
              control={form.control}
              name="homeroom_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelas</FormLabel>
                  <QuerySelect
                    items={filteredHomerooms}
                    isLoading={homerooms.isLoading}
                    value={field.value}
                    onValueChange={field.onChange}
                    getValue={(h) => h.homeroom_id}
                    getLabel={(h) => h.name}
                    placeholder="Pilih kelas"
                    emptyText="Belum ada kelas"
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teacher_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guru</FormLabel>
                  <QuerySelect
                    items={teachers.data ?? []}
                    isLoading={teachers.isLoading}
                    value={field.value}
                    onValueChange={field.onChange}
                    getValue={(t) => t.teacher_id}
                    getLabel={(t) => t.full_name}
                    placeholder="Pilih guru"
                    emptyText="Belum ada guru"
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mata pelajaran</FormLabel>
                  <QuerySelect
                    items={subjects.data ?? []}
                    isLoading={subjects.isLoading}
                    value={field.value}
                    onValueChange={field.onChange}
                    getValue={(s) => s.subject_id}
                    getLabel={(s) => s.name}
                    placeholder="Pilih mapel"
                    emptyText="Belum ada mapel"
                  />
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
