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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
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

const STATUSES: ReportCardStatus[] = ["Draft", "HomeroomReview", "PrincipalApproval", "Published", "Archived"];
const LABELS: Record<ReportCardStatus, string> = {
  Draft: "Draft",
  HomeroomReview: "Review Wali Kelas",
  PrincipalApproval: "Persetujuan Kepala Sekolah",
  Published: "Terbit",
  Archived: "Arsip",
};

const PAGE_SIZE = 10;

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

  const [reportTypeId, setReportTypeId] = React.useState<string>(searchParams.get("report_type_id") ?? "");
  const [homeroomId, setHomeroomId] = React.useState<string>(searchParams.get("homeroom_id") ?? "");

  React.useEffect(() => {
    const next = new URLSearchParams();
    if (reportTypeId) next.set("report_type_id", reportTypeId);
    if (homeroomId) next.set("homeroom_id", homeroomId);
    const query = next.toString();
    router.replace(query ? `/grading/report-cards?${query}` : "/grading/report-cards", { scroll: false });
  }, [reportTypeId, homeroomId, router]);

  const bothSelected = Boolean(reportTypeId && homeroomId);

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-lg">Papan Rapor</CardTitle>
            <CardDescription>Pilih jenis rapor dan kelas untuk mengelola rapor siswa.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Select value={reportTypeId} onValueChange={(value) => { setReportTypeId(value === "__none__" ? "" : value); }}>
              <SelectTrigger className="md:w-56">
                <SelectValue placeholder="Jenis Rapor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Pilih jenis rapor —</SelectItem>
                {(reportTypes.data ?? []).map((rt) => (
                  <SelectItem key={rt.report_type_id} value={rt.report_type_id}>
                    {rt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={homeroomId} onValueChange={(value) => { setHomeroomId(value === "__none__" ? "" : value); }}>
              <SelectTrigger className="md:w-56">
                <SelectValue placeholder="Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Pilih kelas —</SelectItem>
                {(homerooms.data ?? []).map((room) => (
                  <SelectItem key={room.homeroom_id} value={room.homeroom_id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <GenerateDraftButton reportTypeId={reportTypeId} homeroomId={homeroomId} disabled={!bothSelected} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {!yearId ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Silakan pilih tahun ajaran di header untuk melihat jenis rapor.
          </p>
        ) : reportTypes.isLoading || homerooms.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !bothSelected ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Pilih jenis rapor dan kelas untuk memuat papan rapor.
          </p>
        ) : (
          <ReportCardsTable key={`${reportTypeId}:${homeroomId}`} reportTypeId={reportTypeId} homeroomId={homeroomId} />
        )}
      </CardContent>
    </Card>
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
  const [page, setPage] = React.useState(1);
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
  const pageCount = Math.max(1, Math.ceil(statusData.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedData = React.useMemo(
    () => statusData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [statusData, currentPage],
  );

  const columns = React.useMemo<ColumnDef<ReportCard>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Pilih semua di halaman ini"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label="Pilih baris"
          />
        ),
        enableSorting: false,
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
    [studentNameById],
  );

  const selectedIds = Object.keys(selection).filter((id) => selection[id]);

  return (
    <div className="space-y-4">
      <Tabs
        value={activeStatus}
        onValueChange={(value) => {
          setActiveStatus(value as ReportCardStatus);
          setPage(1);
          setSelection({});
        }}
      >
        <TabsList scrollable showScrollFade>
          {STATUSES.map((status) => (
            <TabsTrigger key={status} value={status} className="gap-1.5">
              {LABELS[status]}
              {byStatus[status].length > 0 ? <span>{byStatus[status].length}</span> : ""}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <BulkActionMenu
        selectedIds={selectedIds}
        reportTypeId={reportTypeId}
        homeroomId={homeroomId}
        onDone={() => setSelection({})}
      />

      {cards.isLoading || roster.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <DataTable
          columns={columns}
          data={pagedData}
          getRowId={(row) => row.report_card_id}
          rowSelection={selection}
          onRowSelectionChange={setSelection}
          emptyText={`Belum ada kartu "${LABELS[activeStatus]}". Jalankan Generate Draft.`}
        />
      )}

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Halaman {currentPage} dari {pageCount} · {statusData.length} siswa
          {selectedIds.length > 0 ? ` · ${selectedIds.length} terpilih` : ""}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            Sebelumnya
          </Button>
          <Button variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
            Berikutnya
          </Button>
        </div>
      </div>

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
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
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
