"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { FileText } from "lucide-react";

import { ReportCardsShell } from "@/components/features/grading/report-cards-shell";
import { ReportCardDetailBody } from "@/components/features/grading/report-card-detail-body";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { useGenerateReportCards } from "@/lib/query/mutations/use-grading";
import { useHomeroomRoster } from "@/lib/query/queries/use-academic-ops";
import { type ReportCard, type ReportCardStatus, useReportCards } from "@/lib/query/queries/use-grading";

const STATUSES: ReportCardStatus[] = ["Draft", "HomeroomReview", "PrincipalApproval", "Published", "Archived"];
const LABELS: Record<ReportCardStatus, string> = {
  Draft: "Draft",
  HomeroomReview: "Review Wali Kelas",
  PrincipalApproval: "Persetujuan Kepala Sekolah",
  Published: "Terbit",
  Archived: "Arsip",
};

export default function ClassroomBoardPage() {
  const params = useParams<{ reportTypeId: string; classroomId: string; }>();
  const reportTypeId = params.reportTypeId;
  const homeroomId = params.classroomId;

  return (
    <ReportCardsShell title="Papan Rapor" description="Generate draft, lalu jalankan workflow persetujuan per siswa.">
      <ClassroomBoard reportTypeId={reportTypeId} homeroomId={homeroomId} />
    </ReportCardsShell>
  );
}

function ClassroomBoard({ reportTypeId, homeroomId }: { reportTypeId: string; homeroomId: string; }) {
  const cards = useReportCards(reportTypeId, homeroomId);
  const roster = useHomeroomRoster(homeroomId);
  const generate = useGenerateReportCards(reportTypeId, homeroomId);
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

  async function generateDrafts() {
    try {
      const result = await generate.mutateAsync({ report_type_id: reportTypeId, homeroom_id: homeroomId });
      toast.success(`${result.generated.length} draft dibuat/diperbarui. ${result.skipped.length} dilewati.`);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal generate draft rapor." }));
    }
  }

  const columns = React.useMemo<ColumnDef<ReportCard>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Pilih semua"
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
        header: "Rata-rata",
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/grading/report-cards/${reportTypeId}/classroom`}>← Ganti kelas</Link>
        </Button>
        <Button loading={generate.isPending} onClick={() => void generateDrafts()}>Generate Draft</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Papan Rapor</CardTitle>
          <CardDescription>Filter kartu berdasarkan status alur persetujuan.</CardDescription>
          <Tabs
            value={activeStatus}
            onValueChange={(value) => {
              setActiveStatus(value as ReportCardStatus);
              setSelection({});
            }}
            className="pt-1"
          >
            <TabsList>
              {STATUSES.map((status) => (
                <TabsTrigger key={status} value={status} className="gap-1.5">
                  {LABELS[status]}
                  {byStatus[status].length > 0 ?
                    <span>{byStatus[status].length}</span> : ''}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {cards.isLoading || roster.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <DataTable
              columns={columns}
              data={byStatus[activeStatus]}
              getRowId={(row) => row.report_card_id}
              rowSelection={selection}
              onRowSelectionChange={setSelection}
              emptyText={`Belum ada kartu "${LABELS[activeStatus]}". Jalankan Generate Draft.`}
            />
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {Object.keys(selection).length} siswa terpilih.
      </p>

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
