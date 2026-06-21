"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal, Plus, Trash2, Pencil, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useUpdateAcademicYear,
  useAddCurriculumVersion,
  useDeleteCurriculumVersion,
  useUpsertGradingPolicy,
} from "@/lib/query/mutations/use-academic-config";
import {
  type AcademicYear,
  type CurriculumVersion,
  useAcademicYears,
  useAcademicYearsTable,
  useCurriculumVersions,
  useGradingPolicy,
} from "@/lib/query/queries/use-academic-config";
import {
  academicYearSchema,
  type AcademicYearForm,
  type AcademicYearStatus,
} from "@/lib/schemas/academic-year";
import { StatusConfirmDialog } from "@/components/features/academic-config/status-confirm-dialog";
import {
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

const nextStatuses: Record<string, string[]> = {
  Draft: ["Active"],
  Active: ["Draft", "Closed"],
  Closed: ["Draft", "Active", "Archived"],
  Archived: [],
};

const SORT_FIELDS: Record<string, { asc: AcademicYearsSort; desc: AcademicYearsSort; }> = {
  name: { asc: "name", desc: "-name" },
  start_date: { asc: "start_date", desc: "-start_date" },
  status: { asc: "status", desc: "-status" },
};

export default function AcademicYearsPage() {
  return (
    <AcademicSettingsPage
      title="Pengaturan Akademik"
      description="Kelola kalender akademik, kebijakan nilai, dan versi kurikulum."
    >
      {({ canManageAcademicConfig, upgradeMessage }) => (
        <React.Suspense fallback={null}>
          <AcademicYearsContent canManage={canManageAcademicConfig} upgradeMessage={upgradeMessage} />
        </React.Suspense>
      )}
    </AcademicSettingsPage>
  );
}

function AcademicYearsContent({ canManage, upgradeMessage }: { canManage: boolean; upgradeMessage: string; }) {
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
      {years.isLoading ? <YearsTableSkeleton /> : null}
      {years.error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">Tidak bisa memuat tahun ajaran.</CardContent>
        </Card>
      ) : null}

      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Tahun Ajaran</CardTitle>
              <CardDescription>Kalender akademik, kebijakan nilai, dan versi kurikulum.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Cari nama tahun ajaran"
                className="md:w-72"
              />
              <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
                <span>
                  <Button disabled={!canManage} onClick={() => setCreateOpen(true)} className="gap-1">
                    <Plus className="h-4 w-4" /> Buat Tahun Ajaran
                  </Button>
                </span>
              </EntitlementTooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

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
  meta: { page: number; page_size: number; total: number; };
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
          {formatDate(row.original.start_date)} — {formatDate(row.original.end_date)}
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
        <Badge variant={row.original.status === "Active" ? "default" : row.original.status === "Archived" ? "destructive" : "secondary"}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      size: 120,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const year = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit" onClick={() => onEdit(year)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canManage} aria-label="Aksi lainnya">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{year.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
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
          </div>
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

      <DataTable
        columns={columns}
        data={years}
        getRowId={(row) => row.academic_year_id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyText="Belum ada tahun ajaran."
      />

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
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
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
// Tabbed create/edit modal: § Identitas (always) + tabs for settings sections
// ---------------------------------------------------------------------------

type SettingsTab = "info" | "status" | "kebijakan" | "kurikulum";

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
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("info");
  const yearId = year?.academic_year_id;
  const isCreate = mode === "create" || !yearId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Buat Tahun Ajaran" : `Edit ${year?.name ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Mulai dari status Draft. Kebijakan nilai & versi kurikulum tersedia setelah tahun dibuat."
              : "Perbarui identitas, kebijakan nilai, dan versi kurikulum."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)}>
          <TabsList>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="status" disabled={isCreate}>Status</TabsTrigger>
            <TabsTrigger value="kebijakan" disabled={isCreate}>Kebijakan Nilai</TabsTrigger>
            <TabsTrigger value="kurikulum" disabled={isCreate}>Versi Kurikulum</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <IdentitySection mode={mode} year={year} canManage={canManage} onDone={() => onOpenChange(false)} />
          </TabsContent>

          {yearId ? (
            <>
              <TabsContent value="status">
                <YearStatusSection year={year} canManage={canManage} />
              </TabsContent>
              <TabsContent value="kebijakan">
                <GradingPolicySection yearId={yearId} canManage={canManage} />
              </TabsContent>
              <TabsContent value="kurikulum">
                <CurriculumSection yearId={yearId} canManage={canManage} />
              </TabsContent>
            </>
          ) : null}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_ORDER = ["Draft", "Active", "Closed", "Archived"];

const STATUS_LABELS: Record<string, string> = {
  Draft: "Draft",
  Active: "Aktif",
  Closed: "Ditutup",
  Archived: "Arsip",
};

function StatusTimeline({ currentStatus }: { currentStatus: string; }) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="w-full py-4 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[550px] px-2">
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={status}>
              {/* Node */}
              <div className="flex flex-col items-center relative group">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 z-10",
                    isCompleted && "bg-primary border-primary text-primary-foreground shadow-sm",
                    isActive && "bg-background border-primary text-primary ring-4 ring-primary/10 scale-110 shadow-md",
                    isUpcoming && "bg-background border-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-semibold whitespace-nowrap transition-colors duration-300",
                    isCompleted && "text-muted-foreground/80",
                    isActive && "text-primary font-bold scale-105",
                    isUpcoming && "text-muted-foreground/50"
                  )}
                >
                  {STATUS_LABELS[status]}
                </span>

                {/* Descriptive context for screen-readers */}
                <span className="sr-only">
                  Status {status}: {isCompleted ? "Selesai" : isActive ? "Aktif saat ini" : "Akan datang"}
                </span>
              </div>

              {/* Connecting line */}
              {index < STATUS_ORDER.length - 1 && (
                <div className="flex-1 h-0.5 min-w-[16px] bg-muted mx-2 -mt-6 z-0">
                  <div
                    className={cn(
                      "h-full bg-primary transition-all duration-500",
                      index < currentIndex ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function IdentitySection({
  mode,
  year: initialYear,
  canManage,
  onDone,
}: {
  mode: "create" | "edit";
  year?: AcademicYear;
  canManage: boolean;
  onDone: () => void;
}) {
  const yearsQuery = useAcademicYears({ enabled: mode === "edit" });
  const liveYear = yearsQuery.data?.find((y) => y.academic_year_id === initialYear?.academic_year_id) ?? initialYear;

  const create = useCreateAcademicYear();
  const update = useUpdateAcademicYear(liveYear?.academic_year_id ?? "");
  const form = useForm<AcademicYearForm>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      name: liveYear?.name ?? "",
      start_date: liveYear?.start_date ?? "",
      end_date: liveYear?.end_date ?? "",
    },
  });

  async function onSubmit(values: AcademicYearForm) {
    try {
      if (mode === "create") {
        await create.mutateAsync(values);
        toast.success("Tahun ajaran dibuat.");
        form.reset();
        onDone();
      } else if (mode === "edit" && liveYear) {
        await update.mutateAsync(values);
        toast.success("Tahun ajaran disimpan.");
        onDone();
      }
    } catch (err) {
      const code =
        (err as { error?: { code?: string } })?.error?.code ||
        (err as { code?: string })?.code;
      if (code === "YEAR_NAME_EXISTS") {
        form.setError("name", { message: "Nama tahun ajaran sudah digunakan." });
        return;
      }
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan tahun ajaran." }));
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="academic-year-identity">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama</FormLabel>
              <FormControl>
                <Input placeholder="contoh: 2026/2027" {...field} />
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
        ) : (
          <DialogFooter>
            <Button type="submit" loading={update.isPending} disabled={!canManage}>
              Simpan
            </Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  );
}

function YearStatusSection({
  year: initialYear,
  canManage,
}: {
  year?: AcademicYear;
  canManage: boolean;
}) {
  const yearsQuery = useAcademicYears({ enabled: true });
  const liveYear = yearsQuery.data?.find((y) => y.academic_year_id === initialYear?.academic_year_id) ?? initialYear;
  const transition = useTransitionAcademicYear(liveYear?.academic_year_id ?? "");

  const options = React.useMemo(() => (liveYear ? nextStatuses[liveYear.status] ?? [] : []), [liveYear]);
  const [nextStatus, setNextStatus] = React.useState(options[0] ?? "");
  const [statusConfirmOpen, setStatusConfirmOpen] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNextStatus(options[0] ?? "");
  }, [options]);

  const handleStatusConfirm = async (reason: string) => {
    if (!liveYear || !nextStatus) return;
    try {
      const trimmed = reason.trim();
      await transition.mutateAsync({
        status: nextStatus as AcademicYearStatus,
        reason: trimmed.length > 0 ? trimmed : undefined,
      });
      toast.success("Status tahun ajaran diperbarui.");
      setStatusConfirmOpen(false);
    } catch (err: unknown) {
      let msg = "Tidak bisa mengubah status.";
      const code =
        (err as { error?: { code?: string; }; })?.error?.code ||
        (err as { code?: string; })?.code;
      if (code === "ACTIVE_YEAR_EXISTS") {
        msg = "Tahun ajaran aktif sudah ada untuk penyewa ini. Silakan tutup tahun ajaran aktif terlebih dahulu.";
      } else if (code === "TERM_STILL_ACTIVE") {
        msg = "Masih ada semester yang aktif. Tutup semua semester aktif terlebih dahulu sebelum menutup tahun ajaran.";
      } else if (code === "INVALID_STATE_TRANSITION") {
        msg = "Transisi status ini tidak diperbolehkan.";
      } else if (code === "VALIDATION_ERROR") {
        msg = "Alasan tidak valid. Alasan minimal harus 10 karakter.";
      }
      setStatusError(msg);
      throw err;
    }
  };

  if (!liveYear) return null;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Status saat ini: <span className="text-primary font-bold">{STATUS_LABELS[liveYear.status] ?? liveYear.status}</span></p>
        <p className="text-xs text-muted-foreground">Tahun ajaran mengikuti alur siklus hidup berikut.</p>
      </div>

      <StatusTimeline currentStatus={liveYear.status} />

      {options.length > 0 ? (
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <span className="text-xs text-muted-foreground">Ubah status ke:</span>
          <Select value={nextStatus} onValueChange={setNextStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {STATUS_LABELS[opt] ?? opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={nextStatus === "Archived" ? "destructive" : "default"}
            disabled={!canManage || !nextStatus || transition.isPending}
            loading={transition.isPending && STATUS_ORDER.indexOf(nextStatus) > STATUS_ORDER.indexOf(liveYear.status) && nextStatus !== "Archived"}
            onClick={() => {
              setStatusError(null);
              const currentIdx = STATUS_ORDER.indexOf(liveYear.status);
              const targetIdx = STATUS_ORDER.indexOf(nextStatus);
              const isForward = targetIdx > currentIdx && nextStatus !== "Archived";
              if (isForward) {
                void handleStatusConfirm("");
              } else {
                setStatusConfirmOpen(true);
              }
            }}
          >
            Ubah Status
          </Button>
        </div>
      ) : null}

      {statusError && !statusConfirmOpen && (
        <p className="text-sm text-destructive">{statusError}</p>
      )}

      <StatusConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        currentStatus={liveYear.status}
        targetStatus={nextStatus}
        onConfirm={handleStatusConfirm}
        loading={transition.isPending}
        error={statusError}
        setError={setStatusError}
      />
    </div>
  );
}

function GradingPolicySection({ yearId, canManage }: { yearId?: string; canManage: boolean; }) {
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

function CurriculumSection({ yearId, canManage }: { yearId?: string; canManage: boolean; }) {
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
