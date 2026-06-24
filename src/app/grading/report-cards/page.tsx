"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { FileText, MoreHorizontal } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import { getErrorMessage } from "@/lib/errors/messages";
import { useSelectWithinPage } from "@/lib/data-table/use-select-within-page";
import { useBulkTransitionReportCards, useGenerateReportCards } from "@/lib/query/mutations/use-grading";
import { useHomeroomRoster, useHomerooms } from "@/lib/query/queries/use-academic-ops";
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

export default function ReportCardsPage() {
  return (
    <AuthGuard fallback={<PageSkeleton />}>
      <ReportCardsShell />
    </AuthGuard>
  );
}

function PageSkeleton() {
  return (
    <main className="container mx-auto w-full space-y-6 px-4 py-10">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}

function ReportCardsShell() {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  if (tenant.isLoading || me.isLoading) return <PageSkeleton />;
  if (tenant.error || me.error || !tenant.data || !me.data) {
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
      schoolName={tenant.data.school_name}
      userName={me.data.full_name}
      userEmail={me.data.email}
      isLoggingOut={logout.isPending}
      onLogout={async () => {
        await logout.mutateAsync();
        router.push("/login");
      }}
      className="mx-auto w-full"
    >
      <ReportCardsBoard />
    </SidebarLayout>
  );
}

function ReportCardsBoard() {
  const { yearId, termId } = useAcademicScope();
  const router = useRouter();
  const searchParams = useSearchParams();

  const reportTypes = useReportTypes(yearId ?? undefined, termId ?? undefined);
  const homerooms = useHomerooms();
  const params = parseReportCardsParams(searchParams);
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

  const bothSelected = Boolean(reportTypeId && homeroomId);

  return (
    <DataTableCard
      title="Papan Rapor"
      description="Pilih jenis rapor dan kelas untuk mengelola rapor siswa."
      primaryActions={
        <GenerateDraftButton reportTypeId={reportTypeId} homeroomId={homeroomId} disabled={!bothSelected} />
      }
      toolbar={{
        filters: (
          <>
            <Select
              value={reportTypeId || undefined}
              onValueChange={(value) => onParamsChange({ ...params, report_type_id: value })}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Jenis Rapor" />
              </SelectTrigger>
              <SelectContent>
                {(reportTypes.data ?? []).map((rt) => (
                  <SelectItem key={rt.report_type_id} value={rt.report_type_id}>
                    {rt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={homeroomId || undefined}
              onValueChange={(value) => onParamsChange({ ...params, homeroom_id: value })}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Kelas" />
              </SelectTrigger>
              <SelectContent>
                {(homerooms.data ?? []).map((room) => (
                  <SelectItem key={room.homeroom_id} value={room.homeroom_id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ),
      }}
    >
      {!yearId ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Silakan pilih tahun ajaran di header untuk melihat jenis rapor.
        </p>
      ) : reportTypes.isLoading || homerooms.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !bothSelected ? (
        <p className="p-6 text-center text-sm text-muted-foreground border-t">
          Pilih jenis rapor dan kelas untuk memuat papan rapor.
        </p>
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
  const cards = useReportCards(reportTypeId, homeroomId);
  const roster = useHomeroomRoster(homeroomId);
  const [activeStatus, setActiveStatus] = React.useState<ReportCardStatus>("Draft");
  const [selection, setSelection] = React.useState<RowSelectionState>({});
  const [detailCardId, setDetailCardId] = React.useState<string | null>(null);

  const studentNameById = React.useMemo(
    () => new Map((roster.data ?? []).map((s) => [s.student_id, s.full_name])),
    [roster.data],
  );

  const byStatus = React.useMemo(() => {
    const map: Record<ReportCardStatus, ReportCard[]> = {
      Draft: [],
      HomeroomReview: [],
      PrincipalApproval: [],
      Published: [],
      Archived: [],
    };
    for (const card of cards.data ?? []) map[card.status].push(card);
    return map;
  }, [cards.data]);

  const statusData = byStatus[activeStatus];

  const sortedStatusData = React.useMemo(() => {
    const name = (c: ReportCard) => studentNameById.get(c.student_id) ?? "";
    return [...statusData].sort((a, b) => name(a).localeCompare(name(b), "id", { sensitivity: "base" }));
  }, [statusData, studentNameById]);

  const selectWithinPage = useSelectWithinPage({
    rows: sortedStatusData,
    rowSelection: selection,
    getRowId: (c) => c.report_card_id,
    onRowSelectionChange: setSelection,
    toggleMode: "some",
  });

  const selectedIds = Object.keys(selection).filter((id) => selection[id]);

  const columns = React.useMemo<ColumnDef<ReportCard>[]>(
    () => [
      {
        id: "select",
        header: () => null,
        cell: ({ row }) => (
          <Checkbox
            checked={Boolean(selection[row.original.report_card_id])}
            onCheckedChange={(value) => {
              const next: RowSelectionState = { ...selection };
              if (value) next[row.original.report_card_id] = true;
              else delete next[row.original.report_card_id];
              setSelection(next);
            }}
            aria-label="Pilih baris"
          />
        ),
        enableSorting: false
      },
      {
        id: "name",
        header: "Nama",
        cell: ({ row }) => (
          <span className="font-medium">{studentNameById.get(row.original.student_id) ?? "Siswa tidak ditemukan"}</span>
        ),
      },
      {
        id: "average",
        header: "Nilai",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{row.original.summary.average_score?.toFixed(1) ?? "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setDetailCardId(row.original.report_card_id)}>
              <FileText className="mr-1 h-4 w-4" /> Detail
            </Button>
          </div>
        ),
      },
    ],
    [studentNameById, selection],
  );

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
          <BulkActionMenu
            selectedIds={selectedIds}
            reportTypeId={reportTypeId}
            homeroomId={homeroomId}
            onDone={() => setSelection({})}
          />
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

      {cards.isLoading || roster.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <DataTable
          columns={columns}
          data={sortedStatusData}
          getRowId={(row) => row.report_card_id}
          rowSelection={selection}
          onRowSelectionChange={setSelection}
          emptyText={`Belum ada rapor "${LABELS[activeStatus]}". Jalankan Generate Draft.`}
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
