"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  AcademicSettingsPage,
  EntitlementTooltip,
} from "@/components/features/academic-config/academic-settings";
import { TermFormModal } from "@/components/features/academic-config/term-form-modal";
import { getErrorMessage } from "@/lib/errors/messages";
import { formatDate } from "@/lib/date-utils";
import { useDeleteAcademicTerm } from "@/lib/query/mutations/use-academic-config";
import { type AcademicTerm, useTermsTable } from "@/lib/query/queries/use-academic-config";
import {
  parseAcademicTermsParams,
  serializeAcademicTermsParams,
  type AcademicTermsParams,
  type AcademicTermsSort,
} from "@/lib/schemas/academic-terms-params";
import { useAcademicScope } from "@/hooks/use-academic-scope";

const STATUS_LABELS: Record<string, string> = {
  Draft: "Draft",
  Active: "Aktif",
  Closed: "Ditutup",
  Archived: "Arsip",
};

const SORT_FIELDS: Record<string, { asc: AcademicTermsSort; desc: AcademicTermsSort; }> = {
  name: { asc: "name", desc: "-name" },
  start_date: { asc: "start_date", desc: "-start_date" },
  status: { asc: "status", desc: "-status" },
};

export default function AcademicTermsPage() {
  return (
    <AcademicSettingsPage
      title="Pengaturan Akademik"
      description="Kelola semester dan jenis rapor untuk setiap tahun ajaran."
    >
      {({ canManageAcademicConfig, upgradeMessage }) => (
        <React.Suspense fallback={null}>
          <AcademicTermsContent canManage={canManageAcademicConfig} upgradeMessage={upgradeMessage} />
        </React.Suspense>
      )}
    </AcademicSettingsPage>
  );
}

function AcademicTermsContent({ canManage, upgradeMessage }: { canManage: boolean; upgradeMessage: string; }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { yearId } = useAcademicScope();
  const params = React.useMemo(() => parseAcademicTermsParams(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = React.useState(params.search ?? "");
  const terms = useTermsTable(yearId ?? "", params);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AcademicTerm | null>(null);
  const [editInitialTab, setEditInitialTab] = React.useState<"info" | "rapor">("info");

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search ?? "") !== searchDraft) {
        replaceParams(router, { ...params, search: searchDraft || undefined, page: 1 });
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [params, router, searchDraft]);

  const meta = terms.data?.meta ?? { page: params.page, page_size: params.page_size, total: 0 };

  function openEdit(term: AcademicTerm, tab: "info" | "rapor" = "info") {
    setEditing(term);
    setEditInitialTab(tab);
  }

  return (
    <div className="space-y-4">
      {!yearId ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Silakan pilih tahun ajaran di header untuk mengelola semester.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {terms.isLoading ? <TermsTableSkeleton /> : null}
          {terms.error ? (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">Tidak bisa memuat semester.</CardContent>
            </Card>
          ) : null}

          <Card className="border border-border shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg">Semester</CardTitle>
                  <CardDescription>Daftar semester untuk tahun ajaran yang dipilih.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Cari nama semester"
                    className="md:w-72"
                  />
                  <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
                    <span>
                      <Button disabled={!canManage} onClick={() => setCreateOpen(true)} className="gap-1">
                        <Plus className="h-4 w-4" /> Buat Semester
                      </Button>
                    </span>
                  </EntitlementTooltip>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {terms.data ? (
                <TermsTableSection
                  terms={terms.data.data}
                  meta={meta}
                  params={params}
                  canManage={canManage}
                  yearId={yearId}
                  onParamsChange={(next) => replaceParams(router, next)}
                  onEdit={(term) => openEdit(term, "info")}
                />
              ) : null}
            </CardContent>
          </Card>
        </>
      )}

      <TermFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        yearId={yearId ?? ""}
        canManage={canManage}
        onCreated={(term) => {
          setCreateOpen(false);
          openEdit(term, "rapor");
        }}
      />
      <TermFormModal
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        mode="edit"
        term={editing}
        yearId={yearId ?? ""}
        canManage={canManage}
        initialTab={editInitialTab}
      />
    </div>
  );
}

function TermsTableSection({
  terms,
  meta,
  params,
  canManage,
  yearId,
  onParamsChange,
  onEdit,
}: {
  terms: AcademicTerm[];
  meta: { page: number; page_size: number; total: number; };
  params: AcademicTermsParams;
  canManage: boolean;
  yearId: string;
  onParamsChange: (next: AcademicTermsParams) => void;
  onEdit: (term: AcademicTerm) => void;
}) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [targetId, setTargetId] = React.useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.page_size));

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

  const columns: ColumnDef<AcademicTerm>[] = [
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
        const term = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit" disabled={!canManage} onClick={() => onEdit(term)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={!canManage} aria-label="Aksi lainnya">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{term.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!canManage}
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setTargetId(term.term_id);
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
      <DataTable
        columns={columns}
        data={terms}
        getRowId={(row) => row.term_id}
        emptyText="Belum ada semester. Tambahkan mis. &quot;Semester 1&quot; / &quot;Semester 2&quot;."
      />

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Halaman {meta.page} dari {pageCount} · {meta.total} semester
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
        yearId={yearId}
        clearTarget={() => setTargetId(null)}
      />
    </div>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  targetId,
  yearId,
  clearTarget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string | null;
  yearId: string;
  clearTarget: () => void;
}) {
  const remove = useDeleteAcademicTerm(yearId);

  async function onConfirm() {
    if (!targetId) return;
    try {
      await remove.mutateAsync(targetId);
      toast.success("Semester dihapus.");
      onOpenChange(false);
      clearTarget();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Tidak bisa menghapus semester." }));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Hapus semester?"
      description="Semester yang sudah memiliki jenis rapor atau nilai tidak bisa dihapus."
      confirmLabel="Hapus"
      loadingLabel="Menghapus..."
      loading={remove.isPending}
      destructive
      canConfirm={Boolean(targetId)}
      onConfirm={onConfirm}
    />
  );
}

function replaceParams(router: ReturnType<typeof useRouter>, params: AcademicTermsParams) {
  const query = serializeAcademicTermsParams(params);
  router.replace(query ? `/settings/academic/terms?${query}` : "/settings/academic/terms", {
    scroll: false,
  });
}

function TermsTableSkeleton() {
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
