"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, ChevronUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormLabelRequired, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { StatusConfirmDialog } from "@/components/features/academic-config/status-confirm-dialog";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors/messages";
import { formatDate } from "@/lib/date-utils";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import {
  useCreateAcademicTerm,
  useTransitionAcademicTerm,
  useUpdateAcademicTerm,
} from "@/lib/query/mutations/use-academic-config";
import {
  useApplyTermTemplate,
  useCopyReportTypes,
  useCreateEvaluationTemplate,
  useCreateReportType,
  useDeleteEvaluationTemplate,
  useDeleteReportType,
  useUpdateEvaluationTemplate,
  useUpdateReportType,
  useUpsertFormulaTemplate,
} from "@/lib/query/mutations/use-grading";
import {
  useEvaluationTemplates,
  useFormulaTemplatesForTypes,
  useReportTypes,
  useUnmaterializedCount,
  type EvaluationTemplate,
  type ReportType,
} from "@/lib/query/queries/use-grading";
import { type AcademicTerm, useTerms } from "@/lib/query/queries/use-academic-config";
import { reportTypeCreateSchema, type ReportTypeCreateForm } from "@/lib/schemas/grading";
import {
  academicTermSchema,
  type AcademicTermForm,
  type AcademicTermStatus,
} from "@/lib/schemas/academic-term";

const STATUS_LABELS: Record<string, string> = {
  Draft: "Draft",
  Active: "Aktif",
  Closed: "Ditutup",
  Archived: "Arsip",
};

const termNextStatuses: Record<string, string[]> = {
  Draft: ["Active"],
  Active: ["Draft", "Closed"],
  Closed: ["Draft", "Active", "Archived"],
  Archived: [],
};

type TermTab = "info" | "status" | "rapor" | "evaluasi";

export type TermFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  term?: AcademicTerm | null;
  yearId: string;
  canManage: boolean;
  /** When provided, the modal opens on this tab (edit mode). */
  initialTab?: TermTab;
  /** Notifies the parent of a freshly created term so it can reopen in edit mode. */
  onCreated?: (term: AcademicTerm) => void;
};

export function TermFormModal({
  open,
  onOpenChange,
  mode,
  term,
  yearId,
  canManage,
  initialTab,
  onCreated,
}: TermFormModalProps) {
  const [activeTab, setActiveTab] = React.useState<TermTab>("info");

  React.useEffect(() => {
    if (!open) return;
    setActiveTab(mode === "edit" ? initialTab ?? "info" : "info");
  }, [open, mode, initialTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Buat Semester" : `Edit ${term?.name ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Isi nama dan periode semester. Jenis rapor dapat diatur setelah semester dibuat."
              : "Perbarui info semester dan kelola jenis rapor untuk semester ini."}
          </DialogDescription>
        </DialogHeader>

        {mode === "create" ? (
          <TermCreateSection
            yearId={yearId}
            canManage={canManage}
            onDone={() => onOpenChange(false)}
            onCreated={onCreated}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TermTab)}>
            <TabsList>
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="rapor">Rapor</TabsTrigger>
              <TabsTrigger value="evaluasi">Evaluasi</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              {term ? (
                <TermInfoSection
                  term={term}
                  yearId={yearId}
                  canManage={canManage}
                  onDone={() => onOpenChange(false)}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="status">
              {term ? (
                <TermStatusSection term={term} yearId={yearId} canManage={canManage} />
              ) : null}
            </TabsContent>

            <TabsContent value="rapor">
              {term ? (
                <ReportTypesSection yearId={yearId} termId={term.term_id} canManage={canManage} />
              ) : null}
            </TabsContent>

            <TabsContent value="evaluasi">
              {term ? (
                <EvaluationTemplatesSection yearId={yearId} termId={term.term_id} canManage={canManage} />
              ) : null}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Create ───────────────────────────────────────────────────────────────────

function TermCreateSection({
  yearId,
  canManage,
  onDone,
  onCreated,
}: {
  yearId: string;
  canManage: boolean;
  onDone: () => void;
  onCreated?: (term: AcademicTerm) => void;
}) {
  const create = useCreateAcademicTerm(yearId);
  const copy = useCopyReportTypes(yearId);
  const allTerms = useTerms(yearId);
  const [copyFrom, setCopyFrom] = React.useState<string>("");
  const [doCopy, setDoCopy] = React.useState(false);

  const form = useForm<AcademicTermForm>({
    resolver: zodResolver(academicTermSchema),
    defaultValues: { name: "", start_date: "", end_date: "" },
  });

  // Candidate source terms = existing terms in the same year. The target term
  // doesn't exist yet, so no exclusion is needed; empty list disables the copy.
  const sourceOptions = React.useMemo(
    () => [...(allTerms.data ?? [])].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [allTerms.data],
  );

  async function onSubmit(values: AcademicTermForm) {
    try {
      const created = await create.mutateAsync(values);
      if (doCopy && copyFrom) {
        try {
          const result = await copy.mutateAsync({
            academic_year_id: yearId,
            source_term_id: copyFrom,
            target_term_id: created.term_id,
            overwrite: false,
          });
          toast.success(`${result.copied} jenis rapor disalin, ${result.skipped} dilewati.`);
        } catch (copyErr) {
          toast.error(getErrorMessage(copyErr, { fallback: "Gagal menyalin jenis rapor." }));
        }
      } else {
        toast.success("Semester ditambahkan.");
      }
      form.reset();
      onCreated?.(created);
      onDone();
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menambah semester." }));
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="term-create">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabelRequired>Nama</FormLabelRequired>
              <FormControl>
                <Input placeholder="contoh: Semester 1" disabled={!canManage} {...field} />
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
                <FormLabelRequired>Tanggal mulai</FormLabelRequired>
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
                <FormLabelRequired>Tanggal selesai</FormLabelRequired>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="copy-report-types"
              checked={doCopy}
              onCheckedChange={(v) => setDoCopy(v === true)}
              disabled={!canManage || sourceOptions.length === 0}
            />
            <label htmlFor="copy-report-types" className="text-sm">
              <span className="font-medium">Salin daftar rapor dari semester lain</span>
              <span className="block text-xs text-muted-foreground">
                {sourceOptions.length === 0
                  ? "Belum ada semester lain dengan jenis rapor."
                  : "Pilih semester sumber; kode yang sudah ada akan dilewati."}
              </span>
            </label>
          </div>
          {doCopy && sourceOptions.length > 0 ? (
            <Select value={copyFrom} onValueChange={setCopyFrom} disabled={!canManage}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih semester sumber" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((opt) => (
                  <SelectItem key={opt.term_id} value={opt.term_id}>
                    {opt.name} ({formatDate(opt.start_date)} — {formatDate(opt.end_date)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="submit" loading={create.isPending || copy.isPending} disabled={!canManage}>
            Simpan
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ── Edit: Info tab ───────────────────────────────────────────────────────────

const TERM_STATUS_ORDER = ["Draft", "Active", "Closed", "Archived"];

function TermStatusTimeline({ currentStatus }: { currentStatus: string; }) {
  const currentIndex = TERM_STATUS_ORDER.indexOf(currentStatus);
  return (
    <div className="w-full py-4 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[400px] px-2">
        {TERM_STATUS_ORDER.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isUpcoming = index > currentIndex;
          return (
            <React.Fragment key={status}>
              <div className="flex flex-col items-center relative group">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 z-10",
                    isCompleted && "bg-primary border-primary text-primary-foreground shadow-sm",
                    isActive && "bg-background border-primary text-primary ring-4 ring-primary/10 scale-110 shadow-md",
                    isUpcoming && "bg-background border-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : <span>{index + 1}</span>}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-semibold whitespace-nowrap transition-colors duration-300",
                    isCompleted && "text-muted-foreground/80",
                    isActive && "text-primary font-bold scale-105",
                    isUpcoming && "text-muted-foreground/50",
                  )}
                >
                  {STATUS_LABELS[status]}
                </span>
                <span className="sr-only">
                  Status {status}: {isCompleted ? "Selesai" : isActive ? "Aktif saat ini" : "Akan datang"}
                </span>
              </div>
              {index < TERM_STATUS_ORDER.length - 1 && (
                <div className="flex-1 h-0.5 min-w-[12px] bg-muted mx-2 -mt-6 z-0">
                  <div
                    className={cn(
                      "h-full bg-primary transition-all duration-500",
                      index < currentIndex ? "w-full" : "w-0",
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

function TermInfoSection({
  term: initialTerm,
  yearId,
  canManage,
  onDone,
}: {
  term: AcademicTerm;
  yearId: string;
  canManage: boolean;
  onDone: () => void;
}) {
  const termsQuery = useTerms(yearId);
  const liveTerm = termsQuery.data?.find((t) => t.term_id === initialTerm.term_id) ?? initialTerm;

  const update = useUpdateAcademicTerm(liveTerm.term_id, yearId);
  const form = useForm<AcademicTermForm>({
    resolver: zodResolver(academicTermSchema),
    defaultValues: {
      name: liveTerm.name,
      start_date: liveTerm.start_date,
      end_date: liveTerm.end_date,
    },
  });

  React.useEffect(() => {
    form.reset({ name: liveTerm.name, start_date: liveTerm.start_date, end_date: liveTerm.end_date });
  }, [form, liveTerm.name, liveTerm.start_date, liveTerm.end_date]);

  async function onSubmit(values: AcademicTermForm) {
    try {
      await update.mutateAsync({
        name: values.name,
        start_date: values.start_date,
        end_date: values.end_date,
      });
      toast.success("Semester disimpan.");
      onDone();
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan semester." }));
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="term-info">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabelRequired>Nama</FormLabelRequired>
              <FormControl>
                <Input placeholder="contoh: Semester 1" disabled={!canManage} {...field} />
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
                <FormLabelRequired>Tanggal mulai</FormLabelRequired>
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
                <FormLabelRequired>Tanggal selesai</FormLabelRequired>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" loading={update.isPending} disabled={!canManage}>
            Simpan
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ── Edit: Status tab ─────────────────────────────────────────────────────────

function TermStatusSection({
  term: initialTerm,
  yearId,
  canManage,
}: {
  term: AcademicTerm;
  yearId: string;
  canManage: boolean;
}) {
  const termsQuery = useTerms(yearId);
  const liveTerm = termsQuery.data?.find((t) => t.term_id === initialTerm.term_id) ?? initialTerm;
  const transition = useTransitionAcademicTerm(liveTerm.term_id, yearId);

  const options = termNextStatuses[liveTerm.status] ?? [];
  const [nextStatus, setNextStatus] = React.useState(options[0] ?? "");
  const [statusConfirmOpen, setStatusConfirmOpen] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNextStatus(options[0] ?? "");
  }, [options]);

  const handleStatusConfirm = async (reason: string) => {
    if (!nextStatus) return;
    try {
      const trimmed = reason.trim();
      await transition.mutateAsync({ status: nextStatus as AcademicTermStatus, reason: trimmed.length > 0 ? trimmed : undefined });
      toast.success("Status semester diperbarui.");
      setStatusConfirmOpen(false);
    } catch (err: unknown) {
      setStatusError(getErrorMessage(err, { fallback: "Tidak bisa mengubah status." }));
      throw err;
    }
  };

  const currentIdx = TERM_STATUS_ORDER.indexOf(liveTerm.status);
  const targetIdx = TERM_STATUS_ORDER.indexOf(nextStatus);
  const isForward = targetIdx > currentIdx && nextStatus !== "Archived";

  const handleUbahStatus = () => {
    setStatusError(null);
    if (isForward) {
      void handleStatusConfirm("");
    } else {
      setStatusConfirmOpen(true);
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Status saat ini: <span className="text-primary font-bold">{STATUS_LABELS[liveTerm.status] ?? liveTerm.status}</span>
        </p>
        <p className="text-xs text-muted-foreground">Semester mengikuti alur siklus hidup berikut.</p>
      </div>

      <TermStatusTimeline currentStatus={liveTerm.status} />

      {options.length > 0 ? (
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <span className="text-xs text-muted-foreground">Ubah status ke:</span>
          <Select value={nextStatus} onValueChange={setNextStatus} disabled={!canManage}>
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
            loading={transition.isPending && isForward}
            onClick={handleUbahStatus}
          >
            Ubah Status
          </Button>
        </div>
      ) : null}

      {statusError && (
        <p className="text-sm text-destructive">{statusError}</p>
      )}

      <StatusConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        currentStatus={liveTerm.status}
        targetStatus={nextStatus}
        onConfirm={handleStatusConfirm}
        loading={transition.isPending}
        error={statusError}
        setError={setStatusError}
      />
    </div>
  );
}

// ── Edit: Rapor tab ──────────────────────────────────────────────────────────

function ReportTypesSection({
  yearId,
  termId,
  canManage,
}: {
  yearId: string;
  termId: string;
  canManage: boolean;
}) {
  const types = useReportTypes(yearId, termId);
  const create = useCreateReportType(yearId, termId);
  const update = useUpdateReportType(yearId, termId);
  const remove = useDeleteReportType(yearId, termId);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const emptyValues: ReportTypeCreateForm = { academic_year_id: yearId, term_id: termId, code: "", name: "" };

  const form = useForm<ReportTypeCreateForm>({
    resolver: zodResolver(reportTypeCreateSchema),
    defaultValues: emptyValues,
  });

  React.useEffect(() => {
    form.setValue("term_id", termId);
  }, [termId, form]);

  const sorted = React.useMemo(
    () => [...(types.data ?? [])].sort((a, b) => a.position - b.position),
    [types.data],
  );

  async function onAdd(values: ReportTypeCreateForm) {
    try {
      await create.mutateAsync({ ...values, term_id: termId });
      form.reset({ ...emptyValues, term_id: termId });
      toast.success("Jenis rapor ditambahkan.");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menambah jenis rapor." }));
      }
    }
  }

  async function onDelete(reportTypeId: string) {
    try {
      await remove.mutateAsync(reportTypeId);
      toast.success("Jenis rapor dihapus.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus jenis rapor." }));
    }
  }

  async function onReorder(item: ReportType, direction: "up" | "down") {
    const idx = sorted.findIndex((t) => t.report_type_id === item.report_type_id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    try {
      await Promise.all([
        update.mutateAsync({ reportTypeId: item.report_type_id, position: swap.position }),
        update.mutateAsync({ reportTypeId: swap.report_type_id, position: item.position }),
      ]);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa mengubah urutan." }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Jenis rapor dikelola per semester. Kode dipakai sebagai judul kolom di grid nilai.
        </p>
        <CopyReportTypesButton yearId={yearId} targetTermId={termId} canManage={canManage} excludeTermId={termId} />
      </div>

      {types.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
          Belum ada jenis rapor untuk semester ini. Tambahkan mis. &quot;Rapor UTS&quot; / &quot;Rapor UAS&quot;.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {sorted.map((reportType, idx) => (
            <ReportTypeRow
              key={reportType.report_type_id}
              reportType={reportType}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              isEditing={editingId === reportType.report_type_id}
              canManage={canManage}
              onEdit={() => setEditingId(reportType.report_type_id)}
              onEditDone={() => setEditingId(null)}
              onDelete={() => onDelete(reportType.report_type_id)}
              onMoveUp={() => onReorder(reportType, "up")}
              onMoveDown={() => onReorder(reportType, "down")}
              updateMut={update}
            />
          ))}
        </ul>
      )}

      <div className="border-t pt-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Tambah jenis rapor baru</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onAdd)} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Kode <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Rapor UTS" disabled={!canManage} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Nama <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Rapor Tengah Semester" disabled={!canManage} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="mt-5" loading={create.isPending} disabled={!canManage}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

function EvaluationTemplatesSection({
  yearId,
  termId,
  canManage,
}: {
  yearId: string;
  termId: string;
  canManage: boolean;
}) {
  const templates = useEvaluationTemplates(termId);
  const reportTypes = useReportTypes(yearId, termId);
  const count = useUnmaterializedCount(termId);
  const create = useCreateEvaluationTemplate(termId);
  const update = useUpdateEvaluationTemplate(termId);
  const remove = useDeleteEvaluationTemplate(termId);
  const apply = useApplyTermTemplate(termId);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<EvaluationTemplate | null>(null);
  const [newCode, setNewCode] = React.useState("");
  const [newName, setNewName] = React.useState("");

  const sorted = React.useMemo(
    () => [...(templates.data ?? [])].sort((a, b) => a.position - b.position),
    [templates.data],
  );

  async function onAdd() {
    const code = newCode.trim();
    const name = newName.trim();
    if (!code || !name) return;
    try {
      const position = sorted.length > 0 ? Math.max(...sorted.map((item) => item.position)) + 1 : 1;
      await create.mutateAsync({ term_id: termId, code, name, position });
      setNewCode("");
      setNewName("");
      toast.success("Evaluasi ditambahkan.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menambah evaluasi." }));
    }
  }

  async function onReorder(item: EvaluationTemplate, direction: "up" | "down") {
    const idx = sorted.findIndex((ev) => ev.template_id === item.template_id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    try {
      await Promise.all([
        update.mutateAsync({ templateId: item.template_id, position: swap.position }),
        update.mutateAsync({ templateId: swap.template_id, position: item.position }),
      ]);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa mengubah urutan." }));
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.template_id);
      setDeleteTarget(null);
      toast.success("Evaluasi dihapus.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus evaluasi." }));
    }
  }

  async function onApply() {
    try {
      const result = await apply.mutateAsync();
      toast.success(`${result.evaluations_created} evaluasi dibuat, ${result.weights_created} bobot dibuat.`);
      await count.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menerapkan template evaluasi." }));
    }
  }

  return (
    <div className="space-y-4">
      {count.data && count.data.count > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {count.data.count} penugasan belum punya evaluasi untuk semester ini.
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Daftar ini menjadi master evaluasi semester. Bobot di bawah mengikuti jenis rapor pada tab Rapor.
        </p>
        <Button type="button" size="sm" disabled={!canManage || sorted.length === 0} loading={apply.isPending} onClick={() => void onApply()}>
          Terapkan ke semua penugasan yang belum punya evaluasi
        </Button>
      </div>

      {templates.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
          Belum ada evaluasi semester. Tambahkan mis. UH1, UTS, UAS.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {sorted.map((template, idx) => (
            <EvaluationTemplateRow
              key={template.template_id}
              template={template}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              isEditing={editingId === template.template_id}
              canManage={canManage}
              onEdit={() => setEditingId(template.template_id)}
              onEditDone={() => setEditingId(null)}
              onDelete={() => setDeleteTarget(template)}
              onMoveUp={() => onReorder(template, "up")}
              onMoveDown={() => onReorder(template, "down")}
              updateMut={update}
            />
          ))}
        </ul>
      )}

      <div className="grid gap-3 border-t pt-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Kode</p>
          <Input value={newCode} onChange={(event) => setNewCode(event.target.value)} placeholder="UH1" disabled={!canManage} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Nama</p>
          <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ulangan Harian 1" disabled={!canManage} />
        </div>
        <Button type="button" loading={create.isPending} disabled={!canManage || !newCode.trim() || !newName.trim()} onClick={() => void onAdd()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {sorted.length > 0 ? (
        <TemplateWeightMatrix reportTypes={reportTypes.data ?? []} templates={sorted} canManage={canManage} />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus evaluasi?"
        description="Bobot template untuk evaluasi ini juga akan dihapus. Evaluasi konkret yang sudah dibuat tidak berubah."
        confirmLabel="Hapus"
        destructive
        loading={remove.isPending}
        onConfirm={onDelete}
      />
    </div>
  );
}

function EvaluationTemplateRow({
  template,
  isFirst,
  isLast,
  isEditing,
  canManage,
  onEdit,
  onEditDone,
  onDelete,
  onMoveUp,
  onMoveDown,
  updateMut,
}: {
  template: EvaluationTemplate;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  canManage: boolean;
  onEdit: () => void;
  onEditDone: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  updateMut: ReturnType<typeof useUpdateEvaluationTemplate>;
}) {
  const [editCode, setEditCode] = React.useState(template.code);
  const [editName, setEditName] = React.useState(template.name);

  React.useEffect(() => {
    if (isEditing) {
      setEditCode(template.code);
      setEditName(template.name);
    }
  }, [isEditing, template.code, template.name]);

  async function saveEdit() {
    try {
      await updateMut.mutateAsync({
        templateId: template.template_id,
        code: editCode.trim() || undefined,
        name: editName.trim() || undefined,
      });
      toast.success("Evaluasi diperbarui.");
      onEditDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan perubahan." }));
    }
  }

  if (isEditing) {
    return (
      <li className="flex items-center gap-2 p-3">
        <Input value={editCode} onChange={(event) => setEditCode(event.target.value)} className="h-8 w-28 text-sm" />
        <Input value={editName} onChange={(event) => setEditName(event.target.value)} className="h-8 flex-1 text-sm" />
        <Button size="sm" className="h-8 px-2 text-xs" loading={updateMut.isPending} onClick={() => void saveEdit()}>
          OK
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onEditDone}>
          Batal
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 p-3 text-sm">
      <div className="flex flex-col">
        <Button type="button" variant="ghost" size="sm" disabled={isFirst || !canManage || updateMut.isPending} onClick={onMoveUp} className="h-5 w-5 p-0">
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={isLast || !canManage || updateMut.isPending} onClick={onMoveDown} className="h-5 w-5 p-0">
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {template.code} <span className="text-muted-foreground">· {template.name}</span>
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" disabled={!canManage} onClick={onEdit} className="h-7 w-7 p-0">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" disabled={!canManage} onClick={onDelete} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function TemplateWeightMatrix({
  reportTypes,
  templates,
  canManage,
}: {
  reportTypes: ReportType[];
  templates: EvaluationTemplate[];
  canManage: boolean;
}) {
  const reportTypeIds = React.useMemo(() => reportTypes.map((type) => type.report_type_id), [reportTypes]);
  const formulaTemplates = useFormulaTemplatesForTypes(reportTypeIds);
  const [weights, setWeights] = React.useState<Record<string, Record<string, number>>>({});
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => setHydrated(false), [reportTypeIds.join(","), templates.map((item) => item.template_id).join(",")]);

  React.useEffect(() => {
    if (hydrated || !formulaTemplates.data) return;
    const next: Record<string, Record<string, number>> = {};
    for (const reportType of reportTypes) {
      next[reportType.report_type_id] = {};
      for (const template of templates) next[reportType.report_type_id][template.template_id] = 0;
      for (const row of formulaTemplates.data.get(reportType.report_type_id) ?? []) {
        next[reportType.report_type_id][row.evaluation_template_id] = row.weight;
      }
    }
    setWeights(next);
    setHydrated(true);
  }, [formulaTemplates.data, hydrated, reportTypes, templates]);

  if (reportTypes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
        Tambahkan jenis rapor di tab Rapor sebelum mengatur bobot evaluasi.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground">Bobot evaluasi per jenis rapor</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Evaluasi</th>
              {reportTypes.map((type) => (
                <th key={type.report_type_id} className="px-2 py-2 text-center font-medium">{type.code}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.template_id} className="border-b last:border-0">
                <td className="py-2 pr-3">{template.code}</td>
                {reportTypes.map((type) => (
                  <td key={type.report_type_id} className="px-2 py-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={weights[type.report_type_id]?.[template.template_id] ?? 0}
                      disabled={!canManage}
                      onChange={(event) => {
                        const value = Number(event.target.value || 0);
                        setWeights((current) => ({
                          ...current,
                          [type.report_type_id]: {
                            ...(current[type.report_type_id] ?? {}),
                            [template.template_id]: value,
                          },
                        }));
                      }}
                      className="h-8 text-center"
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="font-medium">
              <td className="py-2 pr-3 text-xs text-muted-foreground">Total</td>
              {reportTypes.map((type) => {
                const total = Object.values(weights[type.report_type_id] ?? {}).reduce((sum, value) => sum + value, 0);
                return (
                  <td key={type.report_type_id} className={cn("px-2 py-2 text-center", total === 100 ? "text-emerald-600" : "text-destructive")}>
                    {total}%
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        {reportTypes.map((type) => (
          <TemplateWeightSaveButton key={type.report_type_id} reportType={type} weights={weights[type.report_type_id] ?? {}} canManage={canManage} />
        ))}
      </div>
    </div>
  );
}

function TemplateWeightSaveButton({
  reportType,
  weights,
  canManage,
}: {
  reportType: ReportType;
  weights: Record<string, number>;
  canManage: boolean;
}) {
  const save = useUpsertFormulaTemplate(reportType.report_type_id);
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);

  async function onSave() {
    try {
      await save.mutateAsync({ weights });
      toast.success(`Bobot ${reportType.code} disimpan.`);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan bobot." }));
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" disabled={!canManage || total !== 100} loading={save.isPending} onClick={() => void onSave()}>
      Simpan bobot {reportType.code}
    </Button>
  );
}

function CopyReportTypesButton({
  yearId,
  targetTermId,
  canManage,
  excludeTermId,
}: {
  yearId: string;
  targetTermId: string;
  canManage: boolean;
  excludeTermId: string;
}) {
  const allTerms = useTerms(yearId);
  const copy = useCopyReportTypes(yearId, targetTermId);
  const [open, setOpen] = React.useState(false);
  const [sourceTerm, setSourceTerm] = React.useState("");

  const sourceOptions = React.useMemo(
    () =>
      [...(allTerms.data ?? [])]
        .filter((t) => t.term_id !== excludeTermId)
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [allTerms.data, excludeTermId],
  );

  async function onConfirm() {
    if (!sourceTerm) return;
    try {
      const result = await copy.mutateAsync({
        academic_year_id: yearId,
        source_term_id: sourceTerm,
        target_term_id: targetTermId,
        overwrite: false,
      });
      toast.success(`${result.copied} jenis rapor disalin, ${result.skipped} dilewati.`);
      setOpen(false);
      setSourceTerm("");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyalin jenis rapor." }));
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        disabled={!canManage || sourceOptions.length === 0}
        onClick={() => setOpen(true)}
      >
        <Copy className="h-4 w-4" /> Salin dari semester lain
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salin jenis rapor</DialogTitle>
            <DialogDescription>
              Pilih semester sumber. Jenis rapor dengan kode yang sudah ada akan dilewati.
            </DialogDescription>
          </DialogHeader>
          <Select value={sourceTerm} onValueChange={setSourceTerm}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih semester sumber" />
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((opt) => (
                <SelectItem key={opt.term_id} value={opt.term_id}>
                  {opt.name} ({formatDate(opt.start_date)} — {formatDate(opt.end_date)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={copy.isPending}>
              Batal
            </Button>
            <Button onClick={() => void onConfirm()} loading={copy.isPending} disabled={!sourceTerm}>
              Salin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportTypeRow({
  reportType,
  isFirst,
  isLast,
  isEditing,
  canManage,
  onEdit,
  onEditDone,
  onDelete,
  onMoveUp,
  onMoveDown,
  updateMut,
}: {
  reportType: ReportType;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  canManage: boolean;
  onEdit: () => void;
  onEditDone: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  updateMut: ReturnType<typeof useUpdateReportType>;
}) {
  const [editCode, setEditCode] = React.useState(reportType.code);
  const [editName, setEditName] = React.useState(reportType.name);

  React.useEffect(() => {
    if (isEditing) {
      setEditCode(reportType.code);
      setEditName(reportType.name);
    }
  }, [isEditing, reportType.code, reportType.name]);

  async function saveEdit() {
    try {
      await updateMut.mutateAsync({
        reportTypeId: reportType.report_type_id,
        code: editCode.trim() || undefined,
        name: editName.trim() || undefined,
      });
      toast.success("Jenis rapor diperbarui.");
      onEditDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan perubahan." }));
    }
  }

  if (isEditing) {
    return (
      <li className="flex items-center gap-2 p-3">
        <Input
          value={editCode}
          onChange={(e) => setEditCode(e.target.value)}
          className="h-8 w-28 text-sm"
          placeholder="Kode"
        />
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="h-8 flex-1 text-sm"
          placeholder="Nama"
        />
        <Button size="sm" className="h-8 px-2 text-xs" loading={updateMut.isPending} onClick={() => void saveEdit()}>
          OK
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={onEditDone}>
          Batal
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 p-3 text-sm">
      <div className="flex flex-col">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isFirst || !canManage || updateMut.isPending}
          onClick={onMoveUp}
          className="h-5 w-5 p-0"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLast || !canManage || updateMut.isPending}
          onClick={onMoveDown}
          className="h-5 w-5 p-0"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {reportType.code} <span className="text-muted-foreground">· {reportType.name}</span>
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" disabled={!canManage} onClick={onEdit} className="h-7 w-7 p-0">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" disabled={!canManage} onClick={onDelete} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

