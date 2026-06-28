"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { AlertTriangle, Columns3, FileText, MoreHorizontal, Printer } from "lucide-react";

import { AuthGuard } from "@/components/features/auth-guard";
import { ReportCardDetailBody } from "@/components/features/grading/report-card-detail-body";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { DataTable } from "@/components/ui/data-table";
import { DataTableCard, DataTableToolbar } from "@/components/ui/data-table-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Combobox } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toaster";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import { getErrorMessage } from "@/lib/errors/messages";
import { useSelectWithinPage } from "@/lib/data-table/use-select-within-page";
import { useBulkTransitionReportCards, useGenerateReportCards } from "@/lib/query/mutations/use-grading";
import { useSubjectsForYear } from "@/lib/query/queries/use-academic-config";
import { useHomeroomRoster, useHomerooms, useTeachingAssignments } from "@/lib/query/queries/use-academic-ops";
import {
  type ReportCard,
  type ReportCardStatus,
  useReportCards,
  useReportTypes,
} from "@/lib/query/queries/use-grading";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import {
  parseReportCardsParams,
  serializeReportCardsParams,
  type ReportCardsParams,
} from "@/lib/schemas/report-cards-params";
import { writeBulkPrintIds } from "@/lib/report-cards/bulk-print";

const STATUSES: ReportCardStatus[] = ["Draft", "HomeroomReview", "PrincipalApproval", "Published", "Archived"];
const LABELS: Record<ReportCardStatus, string> = {
  Draft: "Draft",
  HomeroomReview: "Review Wali Kelas",
  PrincipalApproval: "Persetujuan Kepala Sekolah",
  Published: "Terbit",
  Archived: "Arsip",
};


type TransitionAction = "submit" | "homeroom-approve" | "return" | "principal-approve" | "reject";

const BULK_ACTIONS: { action: TransitionAction; label: string; }[] = [
  { action: "submit", label: "Submit ke Wali Kelas" },
  { action: "homeroom-approve", label: "Approve ke Kepala Sekolah" },
  { action: "return", label: "Return ke Draft" },
  { action: "principal-approve", label: "Publish" },
  { action: "reject", label: "Reject ke Wali Kelas" },
];

type BoardRow = {
  student_id: string;
  full_name: string;
  card: ReportCard | null;
};

export default function ReportCardsPage() {
  return (
    <AuthGuard fallback={
      <SidebarLayout className="mx-auto w-full">
        <DataTableCard
          title="Kelola Rapor"
          description="Pilih jenis rapor dan kelas untuk mengelola rapor siswa."
          toolbar={{
            filters: (
              <>
                <Skeleton className="h-10 w-full sm:w-56" />
                <Skeleton className="h-10 w-full sm:w-56" />
              </>
            )
          }}
        >
          <p className="p-6 text-center text-sm text-muted-foreground border-t">
            Pilih jenis rapor dan kelas untuk memuat data rapor.
          </p>
        </DataTableCard>
      </SidebarLayout>
    }>
      <ReportCardsShell />
    </AuthGuard>
  );
}

function ReportCardsShell() {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();

  const isLoading = tenant.isLoading || me.isLoading;

  if (tenant.error || me.error) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Tidak bisa memuat rapor</AlertTitle>
          <AlertDescription>Coba muat ulang halaman.</AlertDescription>
        </Alert>
      </main>
    );
  }
  return (
    <SidebarLayout
      schoolName={tenant.data?.school_name}
      userName={me.data?.full_name}
      userEmail={me.data?.email}
      isLoggingOut={logout.isPending}
      onLogout={async () => {
        await logout.mutateAsync();
        router.push("/login");
      }}
      className="mx-auto w-full"
    >
      <ReportCardsBoard isLoadingShell={isLoading} />
    </SidebarLayout>
  );
}

function ReportCardsBoard({ isLoadingShell = false }: { isLoadingShell?: boolean; }) {
  const { yearId, termId } = useAcademicScope();
  const router = useRouter();
  const searchParams = useSearchParams();

  const reportTypes = useReportTypes(isLoadingShell ? undefined : yearId ?? undefined, isLoadingShell ? undefined : termId ?? undefined);
  const homerooms = useHomerooms();
  const params = React.useMemo(() => parseReportCardsParams(searchParams), [searchParams]);
  const reportTypeId = params.report_type_id ?? "";
  const homeroomId = params.homeroom_id ?? "";

  const onParamsChange = React.useCallback(
    (nextParams: ReportCardsParams) => {
      const query = serializeReportCardsParams(nextParams);
      router.replace(query ? `/grading/report-cards?${query}` : "/grading/report-cards", {
        scroll: false,
      });
    },
    [router],
  );

  React.useEffect(() => {
    if (reportTypes.data && reportTypes.data.length === 1 && !reportTypeId && !homeroomId) {
      onParamsChange({ report_type_id: reportTypes.data[0].report_type_id });
    }
  }, [reportTypes.data, reportTypeId, homeroomId, onParamsChange]);

  const bothSelected = Boolean(reportTypeId && homeroomId);
  const isLoading = isLoadingShell || reportTypes.isLoading || homerooms.isLoading;

  return (
    <DataTableCard
      title="Kelola Rapor"
      description="Pilih jenis rapor dan kelas untuk mengelola rapor siswa."
      primaryActions={
        <GenerateDraftButton reportTypeId={reportTypeId} homeroomId={homeroomId} disabled={!bothSelected || isLoading} />
      }
      toolbar={{
        filters: (
          <>
            <Combobox
              items={reportTypes.data ?? []}
              isLoading={isLoading}
              value={reportTypeId}
              onValueChange={(value) => onParamsChange({ ...params, report_type_id: value })}
              getOptionValue={(rt) => rt.report_type_id}
              getOptionLabel={(rt) => rt.name}
              placeholder="Jenis Rapor"
              emptyText="Tidak ada jenis rapor"
              searchable
              className="w-full sm:w-56 font-normal"
            />
            <Combobox
              items={homerooms.data ?? []}
              isLoading={isLoading}
              value={homeroomId}
              onValueChange={(value) => onParamsChange({ ...params, homeroom_id: value })}
              getOptionValue={(room) => room.homeroom_id}
              getOptionLabel={(room) => room.name}
              placeholder="Kelas"
              emptyText="Tidak ada kelas"
              searchable
              className="w-full sm:w-56 font-normal"
            />
          </>
        ),
      }}
    >
      {!yearId ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Silakan pilih tahun ajaran di header untuk melihat jenis rapor.
        </p>
      ) : !bothSelected ? (
        <p className="p-6 text-center text-sm text-muted-foreground border-t">
          Pilih jenis rapor dan kelas untuk memuat data rapor.
        </p>
      ) : isLoading ? (
        <div className="space-y-3 px-4 pb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <ReportCardsTable key={`${reportTypeId}:${homeroomId}`} reportTypeId={reportTypeId} homeroomId={homeroomId} />
      )}
    </DataTableCard>
  );
}

function GenerateDraftButton({ reportTypeId, homeroomId, disabled }: { reportTypeId: string; homeroomId: string; disabled?: boolean; }) {
  const generate = useGenerateReportCards(disabled ? undefined : reportTypeId, disabled ? undefined : homeroomId);

  async function generateDrafts() {
    if (disabled) return;
    try {
      const result = await generate.mutateAsync({ report_type_id: reportTypeId, homeroom_id: homeroomId });
      toast.success(`${result.generated.length} draft dibuat/diperbarui. ${result.skipped.length} dilewati.`);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal generate draft rapor." }));
    }
  }

  return (
    <Button loading={generate.isPending} disabled={disabled} onClick={() => void generateDrafts()}>
      Generate Draft
    </Button>
  );
}

function ReportCardsTable({ reportTypeId, homeroomId }: { reportTypeId: string; homeroomId: string; }) {
  const { yearId } = useAcademicScope();
  const cards = useReportCards(reportTypeId, homeroomId);
  const roster = useHomeroomRoster(homeroomId);
  const assignments = useTeachingAssignments(homeroomId);
  const subjects = useSubjectsForYear(yearId ?? undefined);
  const [activeStatus, setActiveStatus] = React.useState<ReportCardStatus>("Draft");
  const [selection, setSelection] = React.useState<RowSelectionState>({});
  const [detailCardId, setDetailCardId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);

  const rows = React.useMemo<BoardRow[]>(() => {
    const cardByStudent = new Map((cards.data ?? []).map((c) => [c.student_id, c]));
    return (roster.data ?? []).map((s) => ({
      student_id: s.student_id,
      full_name: s.full_name ?? "Siswa",
      card: cardByStudent.get(s.student_id) ?? null,
    }));
  }, [roster.data, cards.data]);

  const cardlessCount = React.useMemo(() => rows.filter((r) => !r.card).length, [rows]);

  const assignedSubjects = React.useMemo(() => {
    const subjectById = new Map((subjects.data ?? []).map((s) => [s.subject_id, s]));
    const ids = new Set(
      (assignments.data ?? [])
        .filter((a) => a.academic_year_id === yearId)
        .map((a) => a.subject_id),
    );
    return Array.from(ids)
      .map((id) => subjectById.get(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [assignments.data, subjects.data, yearId]);

  const y = assignedSubjects.length;

  const countScored = React.useCallback((card: ReportCard | null) => {
    if (!card?.summary.subjects) return 0;
    return card.summary.subjects.filter((s) => typeof s.final_score === "number").length;
  }, []);

  const byStatus = React.useMemo(() => {
    const map: Record<ReportCardStatus, BoardRow[]> = {
      Draft: [],
      HomeroomReview: [],
      PrincipalApproval: [],
      Published: [],
      Archived: [],
    };
    for (const row of rows) {
      const status = row.card?.status ?? "Draft";
      map[status].push(row);
    }
    return map;
  }, [rows]);

  const statusData = byStatus[activeStatus];

  const sortedStatusData = React.useMemo(() => {
    return [...statusData].sort((a, b) => a.full_name.localeCompare(b.full_name, "id", { sensitivity: "base" }));
  }, [statusData]);

  const cardRowsOnTab = React.useMemo(() => sortedStatusData.filter((r) => r.card), [sortedStatusData]);

  const selectWithinPage = useSelectWithinPage({
    rows: cardRowsOnTab,
    rowSelection: selection,
    getRowId: (r) => r.card?.report_card_id ?? "",
    onRowSelectionChange: setSelection,
    toggleMode: "some",
  });

  const selectedIds = Object.keys(selection).filter((id) => selection[id]);

  const columns = React.useMemo<ColumnDef<BoardRow>[]>(() => {
    const entryBySubject = (card: ReportCard | null) =>
      new Map(
        (card?.summary.subjects ?? []).map((s) => [
          s.subject_id,
          { final_score: s.final_score, passed: s.passed } as const,
        ]),
      );

    const cols: ColumnDef<BoardRow>[] = [
      {
        id: "select",
        size: 48,
        header: () => null,
        cell: ({ row }) => {
          const card = row.original.card;
          if (!card) {
            return <Checkbox disabled aria-label="Tidak ada rapor" />;
          }
          return (
            <Checkbox
              checked={Boolean(selection[card.report_card_id])}
              onCheckedChange={(value) => {
                const next: RowSelectionState = { ...selection };
                if (value) next[card.report_card_id] = true;
                else delete next[card.report_card_id];
                setSelection(next);
              }}
              aria-label="Pilih baris"
            />
          );
        },
        enableSorting: false,
        meta: { headerClassName: "sticky left-0 z-10 bg-muted", cellClassName: "sticky left-0 z-10 bg-card" },
      },
      {
        id: "name",
        header: "Nama",
        cell: ({ row }) => <span className="font-medium">{row.original.full_name}</span>,
        meta: { headerClassName: "sticky left-12 z-10 bg-muted min-w-[180px]", cellClassName: "sticky left-12 z-10 bg-card min-w-[180px]" },
      },
      {
        id: "progress",
        header: "Progres",
        cell: ({ row }) => {
          const x = countScored(row.original.card);
          const incomplete = x < y;
          return (
            <div className="flex items-center gap-1.5">
              <span className={incomplete ? "font-semibold text-foreground" : "tabular-nums text-muted-foreground"}>
                {x}/{y}
              </span>
              {incomplete ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>Progres nilai belum lengkap</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "average",
        header: "Nilai",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{row.original.card?.summary.average_score?.toFixed(1) ?? "—"}</span>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const card = row.original.card;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={!card}
                onClick={() => card && setDetailCardId(card.report_card_id)}
              >
                <FileText className="mr-1 h-4 w-4" /> Detail
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExpanded((prev) => !prev)}
                aria-pressed={expanded}
                title={expanded ? "Tutup kolom rekapitulasi" : "Buka rekapitulasi nilai per mapel"}
              >
                <Columns3 className="h-4 w-4" />
                {expanded ? "Tutup Rekapitulasi" : "Rekapitulasi Nilai"}
              </Button>
            </div>
          );
        },
        enableSorting: false,
      },
    ];

    if (expanded) {
      for (const subject of assignedSubjects) {
        cols.push({
          id: `subject-${subject.subject_id}`,
          header: subject.name,
          cell: ({ row }) => {
            const entry = entryBySubject(row.original.card).get(subject.subject_id);
            if (!entry) {
              return <span className="text-muted-foreground">—</span>;
            }
            if (!entry.passed) {
              const isZero = entry.final_score === 0;
              const chip = (
                <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                  {entry.final_score.toFixed(1)}
                </span>
              );
              return isZero ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">{chip}</span>
                  </TooltipTrigger>
                  <TooltipContent>Nilai 0 — kemungkinan salah input</TooltipContent>
                </Tooltip>
              ) : (
                chip
              );
            }
            return (
              <span className="tabular-nums text-muted-foreground">{entry.final_score.toFixed(1)}</span>
            );
          },
          enableSorting: false,
          meta: { cellClassName: "text-center", headerClassName: "text-center min-w-[96px]" },
        });
      }
    }

    return cols;
  }, [assignedSubjects, countScored, expanded, selection, y]);

  const isLoading = cards.isLoading || roster.isLoading || assignments.isLoading || subjects.isLoading;

  return (
    <div className="">
      <DataTableToolbar
        className="min-h-[60px]"
        selectAll={{
          checked: selectWithinPage.checked,
          disabled: selectWithinPage.disabled,
          onToggle: () => selectWithinPage.toggleAll(),
        }}
        bulkActions={selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <BulkPrintButton selectedIds={selectedIds} />
            <BulkActionMenu
              selectedIds={selectedIds}
              reportTypeId={reportTypeId}
              homeroomId={homeroomId}
              onDone={() => setSelection({})}
            />
          </div>
        ) : undefined}
        search={
          <Tabs
            value={activeStatus}
            onValueChange={(value) => {
              setActiveStatus(value as ReportCardStatus);
              setSelection({});
            }}
          >
            <TabsList scrollable>
              {STATUSES.map((status) => (
                <TabsTrigger key={status} value={status} className="gap-1.5">
                  {LABELS[status]}
                  {byStatus[status].length > 0 ? <span>{byStatus[status].length}</span> : ""}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {cardlessCount > 0 ? (
        <Alert className="mx-4 mt-3 border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Beberapa siswa belum punya rapor</AlertTitle>
          <AlertDescription>
            {cardlessCount} siswa belum memiliki draft rapor — tidak dapat dicentang atau dilihat detailnya. Klik tombol <span className="font-semibold">Generate Draft</span> untuk membuat rapor.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <DataTable
          columns={columns}
          data={sortedStatusData}
          getRowId={(row) => row.student_id}
          rowSelection={selection}
          onRowSelectionChange={setSelection}
          emptyText={`Belum ada siswa "${LABELS[activeStatus]}". ${activeStatus === "Draft" ? "Jalankan Generate Draft." : ""}`}
          classNames={{ wrapper: "rounded-none border-x-0" }}
        />
      )}

      <Dialog open={detailCardId !== null} onOpenChange={(open) => { if (!open) setDetailCardId(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail Rapor</DialogTitle>
            <DialogDescription>Status, nilai akhir per mapel, dan riwayat approval.</DialogDescription>
          </DialogHeader>
          {detailCardId ? (
            <ReportCardDetailBody reportCardId={detailCardId} reportTypeId={reportTypeId} homeroomId={homeroomId} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BulkPrintButton({ selectedIds }: { selectedIds: string[] }) {
  function handlePrint() {
    if (selectedIds.length === 0) return;
    if (typeof window !== "undefined") {
      writeBulkPrintIds(selectedIds);
      window.open("/grading/report-cards/print?batch=true", "_blank", "noopener,noreferrer");
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1">
      <Printer className="h-4 w-4" />
      Cetak Terpilih ({selectedIds.length})
    </Button>
  );
}

function BulkActionMenu({
  selectedIds,
  reportTypeId,
  homeroomId,
  onDone,
}: {
  selectedIds: string[];
  reportTypeId: string;
  homeroomId: string;
  onDone: () => void;
}) {
  const bulk = useBulkTransitionReportCards(reportTypeId, homeroomId);

  async function run(action: TransitionAction, label: string) {
    try {
      const results = await bulk.mutateAsync({ reportCardIds: selectedIds, action });
      const ok = results.filter((r) => r.ok).length;
      const failed = results.length - ok;
      toast.success(`${ok} berhasil. ${failed > 0 ? `${failed} gagal.` : ""}`);
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: `Gagal ${label.toLowerCase()}.` }));
    }
  }

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 bg-muted/30 text-sm">
      <span>{selectedIds.length} dipilih</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" loading={bulk.isPending} className="gap-1">
            Aksi massal <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Aksi untuk {selectedIds.length} rapor</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {BULK_ACTIONS.map(({ action, label }) => (
            <DropdownMenuItem key={action} onClick={() => run(action, label)}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
