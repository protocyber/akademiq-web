"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  AcademicSettingsPage,
} from "@/components/features/academic-config/academic-settings";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import {
  useAddSubject,
  useBulkDeleteSubjects,
  useDeleteSubject,
  useUpdateSubject,
} from "@/lib/query/mutations/use-academic-config";
import {
  type Subject,
  useSubjectsTable,
} from "@/lib/query/queries/use-academic-config";
import {
  subjectSchema,
  type SubjectForm,
} from "@/lib/schemas/subject";
import {
  parseAcademicSubjectsParams,
  serializeAcademicSubjectsParams,
  type AcademicSubjectsParams,
  type AcademicSubjectsSort,
} from "@/lib/schemas/academic-subjects-params";
import { useAcademicScope } from "@/hooks/use-academic-scope";

const SORT_FIELDS: Record<string, { asc: AcademicSubjectsSort; desc: AcademicSubjectsSort; }> = {
  name: { asc: "name", desc: "-name" },
  code: { asc: "code", desc: "-code" },
  passing_grade: { asc: "passing_grade", desc: "-passing_grade" },
};

export default function AcademicSubjectsPage() {
  return (
    <AcademicSettingsPage
      title="Mata Pelajaran"
      description="Kelola mata pelajaran per versi kurikulum."
    >
      {({ canManageAcademicConfig, upgradeMessage }) => (
        <SubjectsContent canManage={canManageAcademicConfig} upgradeMessage={upgradeMessage} />
      )}
    </AcademicSettingsPage>
  );
}

function SubjectsContent({ canManage }: { canManage: boolean; upgradeMessage: string; }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseAcademicSubjectsParams(searchParams), [searchParams]);

  const { yearId, curriculumId, isResolving } = useAcademicScope();
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");

  const tableParams: AcademicSubjectsParams = React.useMemo(() => ({
    academic_year_id: yearId || undefined,
    curriculum_version_id: curriculumId || undefined,
    search: params.search,
    page: params.page,
    page_size: params.page_size,
    sort: params.sort,
  }), [yearId, curriculumId, params]);

  const subjects = useSubjectsTable(tableParams);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search ?? "") !== searchDraft) {
        router.replace(
          `/settings/academic/subjects?${serializeAcademicSubjectsParams({
            ...params,
            search: searchDraft || undefined,
            page: 1,
          })}`,
          { scroll: false },
        );
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [params, router, searchDraft]);

  const meta = subjects.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 };

  if (isResolving) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!curriculumId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Pilih tahun ajaran dan versi kurikulum di header untuk menampilkan mata pelajaran.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <SubjectsTableSection
        subjects={subjects.data?.data ?? []}
        meta={meta}
        params={tableParams}
        canManage={canManage}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onParamsChange={(next) =>
          router.replace(
            `/settings/academic/subjects?${serializeAcademicSubjectsParams(next)}`,
            { scroll: false },
          )
        }
        isLoading={subjects.isLoading}
        curriculumVersionId={curriculumId}
      />
    </div>
  );
}

function SubjectsTableSection({
  subjects,
  meta,
  params,
  canManage,
  searchDraft,
  onSearchDraftChange,
  onParamsChange,
  isLoading,
  curriculumVersionId,
}: {
  subjects: Subject[];
  meta: { page: number; page_size: number; total: number; };
  params: AcademicSubjectsParams;
  canManage: boolean;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onParamsChange: (next: AcademicSubjectsParams) => void;
  isLoading: boolean;
  curriculumVersionId: string;
}) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [targetId, setTargetId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Subject | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    setRowSelection({});
  }, [params.page, params.search, params.sort, curriculumVersionId]);

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const allSelected = subjects.length > 0 && subjects.every((s) => rowSelection[s.subject_id]);
  const someSelected = subjects.some((s) => rowSelection[s.subject_id]);
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

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

  const columns: ColumnDef<Subject>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            subjects.forEach((s) => {
              if (checked) next[s.subject_id] = true;
              else delete next[s.subject_id];
            });
            setRowSelection(next);
          }}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.subject_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.subject_id] = true;
            else delete next[row.original.subject_id];
            setRowSelection(next);
          }}
          aria-label={`Pilih ${row.original.name}`}
        />
      ),
    },
    {
      id: "name",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => toggleSort("name")}>
          Nama {sortIcon("name")}
        </Button>
      ),
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.name}</span>,
    },
    {
      id: "code",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => toggleSort("code")}>
          Kode {sortIcon("code")}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.code ?? "—"}</span>
      ),
    },
    {
      id: "passing_grade",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => toggleSort("passing_grade")}>
          KKM {sortIcon("passing_grade")}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-foreground">{row.original.passing_grade}</span>
      ),
    },
    {
      id: "actions",
      size: 80,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const subject = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <MoreHorizontal className="h-4 w-4" /> Aksi
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{subject.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditing(subject)}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canManage}
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setTargetId(subject.subject_id);
                  setConfirmDelete(true);
                }}
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
    <div className="space-y-3">
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <span>{selectedIds.length} dipilih</span>
          <Button size="sm" variant="destructive" className="gap-1" disabled={!canManage} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
        </div>
      ) : null}

      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Mata Pelajaran</CardTitle>
              <CardDescription>Kelola mata pelajaran per versi kurikulum.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Input
                value={searchDraft}
                onChange={(event) => onSearchDraftChange(event.target.value)}
                placeholder="Cari nama atau kode"
                className="md:w-72"
              />
              <Button disabled={!canManage} onClick={() => setCreating(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Tambah Mapel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={isLoading ? "space-y-3 pt-6" : "p-6"}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : (
            <DataTable
              columns={columns}
              data={subjects}
              getRowId={(row) => row.subject_id}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              emptyText="Belum ada mata pelajaran."
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Halaman {meta.page} dari {pageCount} · {meta.total} mapel
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onParamsChange({ ...params, page: meta.page - 1 })}>
            Sebelumnya
          </Button>
          <Button variant="outline" size="sm" disabled={meta.page >= pageCount} onClick={() => onParamsChange({ ...params, page: meta.page + 1 })}>
            Berikutnya
          </Button>
        </div>
      </div>

      <SubjectDialog open={creating} onOpenChange={setCreating} mode="create" curriculumVersionId={curriculumVersionId} />
      <SubjectDialog open={Boolean(editing)} onOpenChange={(o) => { if (!o) setEditing(null); }} mode="edit" subject={editing ?? undefined} curriculumVersionId={curriculumVersionId} />

      <SubjectDeleteConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        targetId={targetId}
        selectedIds={selectedIds}
        clearSelection={() => setRowSelection({})}
        clearTarget={() => setTargetId(null)}
      />
    </div>
  );
}

function SubjectDialog({
  open,
  onOpenChange,
  mode,
  subject,
  curriculumVersionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  subject?: Subject;
  curriculumVersionId: string;
}) {
  const add = useAddSubject(curriculumVersionId);
  const update = useUpdateSubject(subject?.subject_id ?? "");
  const form = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      curriculum_version_id: curriculumVersionId,
      name: subject?.name ?? "",
      code: subject?.code ?? "",
      passing_grade: subject?.passing_grade ?? 75,
    },
  });

  React.useEffect(() => {
    form.reset({
      curriculum_version_id: curriculumVersionId,
      name: subject?.name ?? "",
      code: subject?.code ?? "",
      passing_grade: subject?.passing_grade ?? 75,
    });
  }, [form, subject, curriculumVersionId]);

  async function onSubmit(values: SubjectForm) {
    const { curriculum_version_id: _ignored, ...input } = values;
    try {
      if (mode === "create") {
        await add.mutateAsync(input);
        toast.success("Mata pelajaran ditambahkan.");
      } else if (subject) {
        await update.mutateAsync(input);
        toast.success("Mata pelajaran diperbarui.");
      }
      onOpenChange(false);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan mata pelajaran." }));
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Mata Pelajaran" : "Edit Mata Pelajaran"}</DialogTitle>
          <DialogDescription>Nama, kode, dan kriteria ketuntasan minimal (KKM).</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input placeholder="Matematika" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode</FormLabel>
                    <FormControl>
                      <Input placeholder="MTK" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="passing_grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KKM</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" loading={add.isPending || update.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SubjectDeleteConfirm({
  open,
  onOpenChange,
  targetId,
  selectedIds,
  clearSelection,
  clearTarget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string | null;
  selectedIds: string[];
  clearSelection: () => void;
  clearTarget: () => void;
}) {
  const single = useDeleteSubject();
  const bulk = useBulkDeleteSubjects();
  const isSingle = Boolean(targetId);
  const ids = targetId ? [targetId] : selectedIds;
  const count = ids.length;

  async function onConfirm() {
    try {
      if (isSingle && targetId) {
        await single.mutateAsync(targetId);
      } else {
        await bulk.mutateAsync(ids);
      }
      toast.success(`${count} mata pelajaran dihapus.`);
      onOpenChange(false);
      clearSelection();
      clearTarget();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus mata pelajaran." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${count} mata pelajaran?`}
      description="Mata pelajaran yang dipakai penugasan mengajar tidak bisa dihapus."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={single.isPending || bulk.isPending}
      destructive
      canConfirm={count > 0}
      onConfirm={onConfirm}
    />
  );
}
