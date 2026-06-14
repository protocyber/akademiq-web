"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal, Plus, Trash2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";

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
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  AcademicSettingsPage,
  EntitlementTooltip,
} from "@/components/features/academic-config/academic-settings";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import {
  useBulkDeleteAcademicYears,
  useCreateAcademicYear,
  useDeleteAcademicYear,
  useTransitionAcademicYear,
} from "@/lib/query/mutations/use-academic-config";
import {
  type AcademicYear,
  type CurriculumVersion,
  useAcademicYearsTable,
  useCurriculumVersions,
  useGradingPolicy,
} from "@/lib/query/queries/use-academic-config";
import {
  academicYearSchema,
  type AcademicYearForm,
  type YearStatusForm,
} from "@/lib/schemas/academic-year";
import {
  DEFAULT_ACADEMIC_YEARS_PARAMS,
  parseAcademicYearsParams,
  serializeAcademicYearsParams,
  type AcademicYearsParams,
  type AcademicYearsSort,
} from "@/lib/schemas/academic-years-params";
import {
  gradingPolicySchema,
  type GradingPolicyForm,
} from "@/lib/schemas/grading-policy";
import {
  curriculumVersionSchema,
  type CurriculumVersionForm,
} from "@/lib/schemas/subject";
import {
  useAddCurriculumVersion,
  useDeleteCurriculumVersion,
  useUpsertGradingPolicy,
} from "@/lib/query/mutations/use-academic-config";

const nextStatuses: Record<string, string[]> = {
  Planning: ["Configuration"],
  Configuration: ["Active"],
  Active: ["Locked"],
  Locked: ["Finalizing"],
  Finalizing: ["Closed"],
  Closed: ["Archived"],
  Archived: [],
};

const SORT_FIELDS: Record<string, { asc: AcademicYearsSort; desc: AcademicYearsSort }> = {
  name: { asc: "name", desc: "-name" },
  start_date: { asc: "start_date", desc: "-start_date" },
  status: { asc: "status", desc: "-status" },
};

export default function AcademicYearsPage() {
  return (
    <AcademicSettingsPage
      title="Tahun Ajaran"
      description="Kelola kalender akademik, kebijakan nilai, dan versi kurikulum."
    >
      {({ canManageAcademicConfig, upgradeMessage }) => (
        <AcademicYearsContent canManage={canManageAcademicConfig} upgradeMessage={upgradeMessage} />
      )}
    </AcademicSettingsPage>
  );
}

function AcademicYearsContent({ canManage, upgradeMessage }: { canManage: boolean; upgradeMessage: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseAcademicYearsParams(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");
  const years = useAcademicYearsTable(params);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AcademicYear | null>(null);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search ?? "") !== searchDraft) {
        replaceParams(router, { ...params, search: searchDraft || undefined, page: 1 });
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [params, router, searchDraft]);

  const meta = years.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Cari nama tahun ajaran"
            className="md:w-72"
          />
        </div>
        <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
          <span>
            <Button disabled={!canManage} onClick={() => setCreateOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Buat Tahun Ajaran
            </Button>
          </span>
        </EntitlementTooltip>
      </div>

      {years.isLoading ? <YearsTableSkeleton /> : null}
      {years.error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">Tidak bisa memuat tahun ajaran.</CardContent>
        </Card>
      ) : null}

      {years.data ? (
        <YearsTableSection
          years={years.data.data}
          meta={meta}
          params={params}
          canManage={canManage}
          onParamsChange={(next) => replaceParams(router, next)}
          onEdit={(year) => setEditing(year)}
        />
      ) : null}

      <YearFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        canManage={canManage}
      />
      <YearFormModal
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        mode="edit"
        year={editing ?? undefined}
        canManage={canManage}
      />
    </div>
  );
}

function YearsTableSection({
  years,
  meta,
  params,
  canManage,
  onParamsChange,
  onEdit,
}: {
  years: AcademicYear[];
  meta: { page: number; page_size: number; total: number };
  params: AcademicYearsParams;
  canManage: boolean;
  onParamsChange: (next: AcademicYearsParams) => void;
  onEdit: (year: AcademicYear) => void;
}) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [targetId, setTargetId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRowSelection({});
  }, [params.page, params.search, params.sort]);

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));

  function toggleSort(field: keyof typeof SORT_FIELDS) {
    const { asc, desc } = SORT_FIELDS[field];
    const next = params.sort === asc ? desc : asc;
    onParamsChange({ ...params, sort: next, page: 1 });
  }

  const allSelected = years.length > 0 && years.every((y) => rowSelection[y.academic_year_id]);
  const someSelected = years.some((y) => rowSelection[y.academic_year_id]);
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  function sortIcon(field: keyof typeof SORT_FIELDS) {
    const { asc, desc } = SORT_FIELDS[field];
    if (params.sort === asc) return <ArrowUp className="h-3.5 w-3.5" />;
    if (params.sort === desc) return <ArrowDown className="h-3.5 w-3.5" />;
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
  }

  const columns: ColumnDef<AcademicYear>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            years.forEach((y) => {
              if (checked) next[y.academic_year_id] = true;
              else delete next[y.academic_year_id];
            });
            setRowSelection(next);
          }}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.academic_year_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.academic_year_id] = true;
            else delete next[row.original.academic_year_id];
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
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.original.name}</span>
      ),
    },
    {
      id: "start_date",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => toggleSort("start_date")}>
          Periode {sortIcon("start_date")}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.start_date} — {row.original.end_date}
        </span>
      ),
    },
    {
      id: "status",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => toggleSort("status")}>
          Status {sortIcon("status")}
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.status === "Active" ? "default" : "secondary"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      size: 80,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const year = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <MoreHorizontal className="h-4 w-4" /> Aksi
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{year.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(year)}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canManage}
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setTargetId(year.academic_year_id);
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
        <BulkActionBar
          selectedCount={selectedIds.length}
          canManage={canManage}
          onConfirm={() => setConfirmDelete(true)}
        />
      ) : null}

      <Card className="border border-border shadow-sm">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={years}
            getRowId={(row) => row.academic_year_id}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            emptyText="Belum ada tahun ajaran."
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Halaman {meta.page} dari {pageCount} · {meta.total} tahun
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

      <DeleteConfirmDialog
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

function BulkActionBar({
  selectedCount,
  canManage,
  onConfirm,
}: {
  selectedCount: number;
  canManage: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <span>{selectedCount} dipilih</span>
      <Button size="sm" variant="destructive" className="gap-1" disabled={!canManage} onClick={onConfirm}>
        <Trash2 className="h-4 w-4" /> Hapus
      </Button>
    </div>
  );
}

function DeleteConfirmDialog({
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
  const single = useDeleteAcademicYear();
  const bulk = useBulkDeleteAcademicYears();
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
      toast.success(`${count} tahun ajaran dihapus.`);
      onOpenChange(false);
      clearSelection();
      clearTarget();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus tahun ajaran." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${count} tahun ajaran?`}
      description="Tahun yang sedang Active atau dipakai homeroom/penugasan tidak bisa dihapus."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={single.isPending || bulk.isPending}
      destructive
      canConfirm={count > 0}
      onConfirm={onConfirm}
    />
  );
}

function replaceParams(router: ReturnType<typeof useRouter>, params: AcademicYearsParams) {
  const query = serializeAcademicYearsParams(params);
  router.replace(query ? `/settings/academic/years?${query}` : "/settings/academic/years", {
    scroll: false,
  });
}

// ---------------------------------------------------------------------------
// Sectioned create/edit modal: § Identitas / § Kebijakan Nilai / § Versi Kurikulum
// ---------------------------------------------------------------------------

function YearFormModal({
  open,
  onOpenChange,
  mode,
  year,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  year?: AcademicYear;
  canManage: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Buat Tahun Ajaran" : `Edit ${year?.name ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Mulai dari status Planning. Kebijakan nilai & kurikulum tersedia setelah tahun dibuat."
              : "Perbarui identitas, kebijakan nilai, dan versi kurikulum."}
          </DialogDescription>
        </DialogHeader>

        <IdentitySection mode={mode} year={year} canManage={canManage} onDone={() => onOpenChange(false)} />
        <GradingPolicySection yearId={year?.academic_year_id} canManage={canManage} />
        <CurriculumSection yearId={year?.academic_year_id} canManage={canManage} />
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border-t pt-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function IdentitySection({
  mode,
  year,
  canManage,
  onDone,
}: {
  mode: "create" | "edit";
  year?: AcademicYear;
  canManage: boolean;
  onDone: () => void;
}) {
  const create = useCreateAcademicYear();
  const transition = useTransitionAcademicYear(year?.academic_year_id ?? "");
  const form = useForm<AcademicYearForm>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      name: year?.name ?? "",
      start_date: year?.start_date ?? "",
      end_date: year?.end_date ?? "",
    },
  });

  const options = React.useMemo(() => (year ? nextStatuses[year.status] ?? [] : []), [year]);
  const [nextStatus, setNextStatus] = React.useState(options[0] ?? "");
  React.useEffect(() => {
    setNextStatus(options[0] ?? "");
  }, [options]);

  async function onSubmit(values: AcademicYearForm) {
    try {
      if (mode === "create") {
        await create.mutateAsync(values);
        toast.success("Tahun ajaran dibuat.");
        form.reset();
        onDone();
      }
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan tahun ajaran." }));
      }
    }
  }

  async function onTransition() {
    if (!year || !nextStatus) return;
    try {
      await transition.mutateAsync({ status: nextStatus as YearStatusForm["status"] });
      toast.success("Status tahun ajaran diperbarui.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa mengubah status." }));
    }
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="academic-year-identity">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama</FormLabel>
                <FormControl>
                  <Input placeholder="2026/2027" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal mulai</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
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
                  <FormLabel>Tanggal selesai</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {mode === "create" ? (
            <DialogFooter>
              <Button type="submit" loading={create.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          ) : null}
        </form>
      </Form>

      {mode === "edit" && year ? (
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium text-foreground">Status saat ini</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={year.status === "Active" ? "default" : "secondary"}>{year.status}</Badge>
            <Select
              value={nextStatus}
              onValueChange={setNextStatus}
              disabled={!canManage || options.length === 0 || transition.isPending}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tidak ada transisi" />
              </SelectTrigger>
              <SelectContent>
                {options.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              loading={transition.isPending}
              disabled={!canManage || !nextStatus || options.length === 0}
              onClick={onTransition}
            >
              Ubah Status
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GradingPolicySection({ yearId, canManage }: { yearId?: string; canManage: boolean }) {
  const policy = useGradingPolicy(yearId);
  const upsert = useUpsertGradingPolicy(yearId ?? "");
  const form = useForm<GradingPolicyForm>({
    resolver: zodResolver(gradingPolicySchema),
    defaultValues: {
      academic_year_id: yearId ?? "",
      minimum_passing_score: 75,
      grading_scale: "0-100",
    },
  });

  React.useEffect(() => {
    form.reset({
      academic_year_id: yearId ?? "",
      minimum_passing_score: policy.data?.minimum_passing_score ?? 75,
      grading_scale: (policy.data?.grading_scale as GradingPolicyForm["grading_scale"]) ?? "0-100",
    });
  }, [form, policy.data, yearId]);

  const disabled = !yearId;

  async function onSubmit(values: GradingPolicyForm) {
    if (!yearId) return;
    const { academic_year_id: _ignored, ...input } = values;
    try {
      await upsert.mutateAsync(input);
      toast.success("Kebijakan nilai disimpan.");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan kebijakan nilai." }));
      }
    }
  }

  return (
    <div className="space-y-3">
      <SectionHeading
        title="§ Kebijakan Nilai"
        hint={disabled ? "Tersedia setelah tahun ajaran dibuat." : undefined}
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="minimum_passing_score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min. kelulusan</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={disabled} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grading_scale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skala</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled || !canManage}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0-100">0-100</SelectItem>
                      <SelectItem value="A-E">A-E</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" loading={upsert.isPending} disabled={disabled || !canManage}>
            Simpan Kebijakan
          </Button>
        </form>
      </Form>
    </div>
  );
}

function CurriculumSection({ yearId, canManage }: { yearId?: string; canManage: boolean }) {
  const versions = useCurriculumVersions(yearId);
  const add = useAddCurriculumVersion(yearId ?? "");
  const remove = useDeleteCurriculumVersion();
  const form = useForm<CurriculumVersionForm>({
    resolver: zodResolver(curriculumVersionSchema),
    defaultValues: { name: "", description: "" },
  });

  const disabled = !yearId;

  async function onAdd(values: CurriculumVersionForm) {
    if (!yearId) return;
    try {
      await add.mutateAsync(values);
      form.reset({ name: "", description: "" });
      toast.success("Versi kurikulum ditambahkan.");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menambah kurikulum." }));
      }
    }
  }

  async function onDelete(version: CurriculumVersion) {
    try {
      await remove.mutateAsync(version.curriculum_version_id);
      toast.success("Versi kurikulum dihapus.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus kurikulum." }));
    }
  }

  return (
    <div className="space-y-3 pb-2">
      <SectionHeading
        title="§ Versi Kurikulum"
        hint={disabled ? "Tersedia setelah tahun ajaran dibuat." : undefined}
      />
      <div className="space-y-2">
        {versions.data?.length ? (
          versions.data.map((version) => (
            <div
              key={version.curriculum_version_id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{version.name}</p>
                {version.description ? (
                  <p className="truncate text-xs text-muted-foreground">{version.description}</p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={disabled || !canManage}
                loading={remove.isPending}
                onClick={() => onDelete(version)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada versi kurikulum.</p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onAdd)} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="Nama versi kurikulum" disabled={disabled} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" loading={add.isPending} disabled={disabled || !canManage} className="gap-1">
            <Plus className="h-4 w-4" /> Tambah
          </Button>
        </form>
      </Form>
    </div>
  );
}

function YearsTableSkeleton() {
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
