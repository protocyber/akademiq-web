"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

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
  useAddClassTemplate,
  useBulkDeleteClassTemplates,
  useDeleteClassTemplate,
  useUpdateClassTemplate,
} from "@/lib/query/mutations/use-academic-config";
import {
  type ClassTemplate,
  useClassTemplatesTable,
} from "@/lib/query/queries/use-academic-config";
import {
  classTemplateSchema,
  type ClassTemplateForm,
} from "@/lib/schemas/class-template";
import {
  parseAcademicClassTemplatesParams,
  serializeAcademicClassTemplatesParams,
  type AcademicClassTemplatesParams,
  type AcademicClassTemplatesSort,
} from "@/lib/schemas/academic-class-templates-params";
import { useAcademicScope } from "@/hooks/use-academic-scope";

const SORT_FIELDS: Record<string, { asc: AcademicClassTemplatesSort; desc: AcademicClassTemplatesSort }> = {
  grade_level: { asc: "grade_level", desc: "-grade_level" },
  default_capacity: { asc: "default_capacity", desc: "-default_capacity" },
};

export default function ClassTemplatesPage() {
  return (
    <AcademicSettingsPage
      title="Template Kelas"
      description="Template kapasitas kelas per tahun ajaran."
    >
      {({ canManageAcademicConfig, upgradeMessage }) => (
        <ClassTemplatesContent canManage={canManageAcademicConfig} upgradeMessage={upgradeMessage} />
      )}
    </AcademicSettingsPage>
  );
}

function ClassTemplatesContent({ canManage }: { canManage: boolean; upgradeMessage: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = React.useMemo(() => parseAcademicClassTemplatesParams(searchParams), [searchParams]);
  const { yearId, isResolving } = useAcademicScope();
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");

  const tableParams: AcademicClassTemplatesParams = React.useMemo(() => ({
    academic_year_id: yearId || undefined,
    search: params.search,
    page: params.page,
    page_size: params.page_size,
    sort: params.sort,
  }), [yearId, params]);

  const templates = useClassTemplatesTable(tableParams);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search ?? "") !== searchDraft) {
        router.replace(
          `/settings/academic/class-templates?${serializeAcademicClassTemplatesParams({
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

  const meta = templates.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 };

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

  if (!yearId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Pilih tahun ajaran di header untuk menampilkan template kelas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <ClassTemplatesTableSection
        templates={templates.data?.data ?? []}
        meta={meta}
        params={tableParams}
        canManage={canManage}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onParamsChange={(next) =>
          router.replace(
            `/settings/academic/class-templates?${serializeAcademicClassTemplatesParams(next)}`,
            { scroll: false },
          )
        }
        isLoading={templates.isLoading}
        academicYearId={yearId}
      />
    </div>
  );
}

function ClassTemplatesTableSection({
  templates,
  meta,
  params,
  canManage,
  searchDraft,
  onSearchDraftChange,
  onParamsChange,
  isLoading,
  academicYearId,
}: {
  templates: ClassTemplate[];
  meta: { page: number; page_size: number; total: number };
  params: AcademicClassTemplatesParams;
  canManage: boolean;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onParamsChange: (next: AcademicClassTemplatesParams) => void;
  isLoading: boolean;
  academicYearId: string;
}) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [targetId, setTargetId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<ClassTemplate | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    setRowSelection({});
  }, [params.page, params.search, params.sort, academicYearId]);

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const allSelected = templates.length > 0 && templates.every((t) => rowSelection[t.template_id]);
  const someSelected = templates.some((t) => rowSelection[t.template_id]);
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

  const columns: ColumnDef<ClassTemplate>[] = [
    {
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            templates.forEach((t) => {
              if (checked) next[t.template_id] = true;
              else delete next[t.template_id];
            });
            setRowSelection(next);
          }}
          aria-label="Pilih semua"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(rowSelection[row.original.template_id])}
          onCheckedChange={(checked) => {
            const next: RowSelectionState = { ...rowSelection };
            if (checked) next[row.original.template_id] = true;
            else delete next[row.original.template_id];
            setRowSelection(next);
          }}
          aria-label={`Pilih ${row.original.grade_level}`}
        />
      ),
    },
    {
      id: "grade_level",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => toggleSort("grade_level")}>
          Tingkat {sortIcon("grade_level")}
        </Button>
      ),
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.grade_level}</span>,
    },
    {
      id: "default_capacity",
      header: () => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => toggleSort("default_capacity")}>
          Kapasitas {sortIcon("default_capacity")}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-foreground">{row.original.default_capacity}</span>
      ),
    },
    {
      id: "actions",
      size: 80,
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => {
        const template = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <MoreHorizontal className="h-4 w-4" /> Aksi
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{template.grade_level}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditing(template)}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canManage}
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setTargetId(template.template_id);
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
      <div className="flex items-center justify-between gap-3">
        <Input
          value={searchDraft}
          onChange={(event) => onSearchDraftChange(event.target.value)}
          placeholder="Cari tingkat"
          className="md:w-72"
        />
        <Button disabled={!canManage} onClick={() => setCreating(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Tambah Template
        </Button>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <span>{selectedIds.length} dipilih</span>
          <Button size="sm" variant="destructive" className="gap-1" disabled={!canManage} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border shadow-sm">
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={templates}
              getRowId={(row) => row.template_id}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              emptyText="Belum ada template kelas."
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Halaman {meta.page} dari {pageCount} · {meta.total} template
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

      <ClassTemplateDialog open={creating} onOpenChange={setCreating} mode="create" academicYearId={academicYearId} />
      <ClassTemplateDialog open={Boolean(editing)} onOpenChange={(o) => { if (!o) setEditing(null); }} mode="edit" template={editing ?? undefined} academicYearId={academicYearId} />

      <ClassTemplateDeleteConfirm
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

function ClassTemplateDialog({
  open,
  onOpenChange,
  mode,
  template,
  academicYearId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  template?: ClassTemplate;
  academicYearId: string;
}) {
  const add = useAddClassTemplate(academicYearId);
  const update = useUpdateClassTemplate(template?.template_id ?? "");
  const form = useForm<ClassTemplateForm>({
    resolver: zodResolver(classTemplateSchema),
    defaultValues: {
      academic_year_id: academicYearId,
      grade_level: template?.grade_level ?? "",
      default_capacity: template?.default_capacity ?? 30,
    },
  });

  React.useEffect(() => {
    form.reset({
      academic_year_id: academicYearId,
      grade_level: template?.grade_level ?? "",
      default_capacity: template?.default_capacity ?? 30,
    });
  }, [form, template, academicYearId]);

  async function onSubmit(values: ClassTemplateForm) {
    const { academic_year_id: _ignored, ...input } = values;
    try {
      if (mode === "create") {
        await add.mutateAsync(input);
        toast.success("Template kelas ditambahkan.");
      } else if (template) {
        await update.mutateAsync(input);
        toast.success("Template kelas diperbarui.");
      }
      onOpenChange(false);
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(getErrorMessage(err, { fallback: "Tidak bisa menyimpan template kelas." }));
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Template Kelas" : "Edit Template Kelas"}</DialogTitle>
          <DialogDescription>Tingkat dan kapasitas default.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="grade_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tingkat</FormLabel>
                    <FormControl>
                      <Input placeholder="X" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_capacity"
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

function ClassTemplateDeleteConfirm({
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
  const single = useDeleteClassTemplate();
  const bulk = useBulkDeleteClassTemplates();
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
      toast.success(`${count} template dihapus.`);
      onOpenChange(false);
      clearSelection();
      clearTarget();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus template." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hapus ${count} template kelas?`}
      description="Template kelas selalu dapat dihapus (bersifat advisory)."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={single.isPending || bulk.isPending}
      destructive
      canConfirm={count > 0}
      onConfirm={onConfirm}
    />
  );
}
