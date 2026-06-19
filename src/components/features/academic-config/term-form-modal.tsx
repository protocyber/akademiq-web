"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { StatusConfirmDialog } from "@/components/features/academic-config/status-confirm-dialog";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import {
  useCreateAcademicTerm,
  useTransitionAcademicTerm,
  useUpdateAcademicTerm,
} from "@/lib/query/mutations/use-academic-config";
import {
  useCopyReportTypes,
  useCreateReportType,
  useDeleteReportType,
  useUpdateReportType,
} from "@/lib/query/mutations/use-grading";
import { useReportTypes, type ReportType } from "@/lib/query/queries/use-grading";
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

type TermTab = "info" | "rapor";

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
              <TabsTrigger value="rapor">Rapor</TabsTrigger>
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

            <TabsContent value="rapor">
              {term ? (
                <ReportTypesSection yearId={yearId} termId={term.term_id} canManage={canManage} />
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
              <FormLabel>Nama</FormLabel>
              <FormControl>
                <Input placeholder="Semester 1" disabled={!canManage} {...field} />
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
                    {opt.name} ({opt.start_date} — {opt.end_date})
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

function TermInfoSection({
  term,
  yearId,
  canManage,
  onDone,
}: {
  term: AcademicTerm;
  yearId: string;
  canManage: boolean;
  onDone: () => void;
}) {
  const update = useUpdateAcademicTerm(term.term_id, yearId);
  const transition = useTransitionAcademicTerm(term.term_id, yearId);
  const form = useForm<AcademicTermForm>({
    resolver: zodResolver(academicTermSchema),
    defaultValues: {
      name: term.name,
      start_date: term.start_date,
      end_date: term.end_date,
    },
  });

  React.useEffect(() => {
    form.reset({ name: term.name, start_date: term.start_date, end_date: term.end_date });
  }, [form, term.name, term.start_date, term.end_date]);

  const options = termNextStatuses[term.status] ?? [];
  const [nextStatus, setNextStatus] = React.useState(options[0] ?? "");
  const [statusConfirmOpen, setStatusConfirmOpen] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNextStatus(options[0] ?? "");
  }, [options]);

  async function onSubmit(values: AcademicTermForm) {
    try {
      await update.mutateAsync({
        name: values.name,
        start_date: values.start_date,
        end_date: values.end_date,
      });
      if (nextStatus && nextStatus !== term.status) {
        try {
          await transition.mutateAsync({ status: nextStatus as AcademicTermStatus, reason: "Perubahan dari formulir semester" });
        } catch (transitionErr) {
          toast.error(getErrorMessage(transitionErr, { fallback: "Identitas tersimpan, namun gagal mengubah status." }));
          return;
        }
      }
      toast.success("Semester disimpan.");
      onDone();
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan semester." }));
      }
    }
  }

  const handleStatusConfirm = async (reason: string) => {
    if (!nextStatus) return;
    try {
      await transition.mutateAsync({ status: nextStatus as AcademicTermStatus, reason });
      toast.success("Status semester diperbarui.");
      setStatusConfirmOpen(false);
    } catch (err: unknown) {
      setStatusError(getErrorMessage(err, { fallback: "Tidak bisa mengubah status." }));
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="term-info">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama</FormLabel>
                <FormControl>
                  <Input placeholder="Semester 1" disabled={!canManage} {...field} />
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

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <span className="text-muted-foreground">Status saat ini</span>
            <Badge variant={term.status === "Active" ? "default" : term.status === "Archived" ? "destructive" : "secondary"}>
              {STATUS_LABELS[term.status] ?? term.status}
            </Badge>
          </div>

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
                variant={nextStatus === "Archived" ? "destructive" : "default"}
                disabled={!canManage || !nextStatus}
                onClick={() => {
                  setStatusError(null);
                  setStatusConfirmOpen(true);
                }}
              >
                Ubah Status
              </Button>
            </div>
          ) : null}

          {canManage ? (
            <DialogFooter>
              <Button type="submit" loading={update.isPending || transition.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          ) : null}
        </form>
      </Form>

      <StatusConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        currentStatus={term.status}
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
                  <FormLabel className="text-xs">Kode</FormLabel>
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
                  <FormLabel className="text-xs">Nama</FormLabel>
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
                  {opt.name} ({opt.start_date} — {opt.end_date})
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

