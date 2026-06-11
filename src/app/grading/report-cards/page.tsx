"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuerySelect } from "@/components/ui/query-select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { useLogout } from "@/lib/query/mutations/use-logout";
import { useGenerateReportCards, useTransitionReportCard } from "@/lib/query/mutations/use-grading";
import { useAcademicYears } from "@/lib/query/queries/use-academic-config";
import { useHomeroomRoster, useHomerooms } from "@/lib/query/queries/use-academic-ops";
import { ReportCard, ReportCardStatus, useReportCards } from "@/lib/query/queries/use-grading";
import { useMe } from "@/lib/query/queries/use-me";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";

const statuses: ReportCardStatus[] = ["Draft", "HomeroomReview", "PrincipalApproval", "Published", "Archived"];
const labels: Record<ReportCardStatus, string> = {
  Draft: "Draft",
  HomeroomReview: "Review Wali Kelas",
  PrincipalApproval: "Persetujuan Kepala Sekolah",
  Published: "Terbit",
  Archived: "Arsip",
};

export default function ReportCardsPage() {
  return <AuthGuard fallback={<PageSkeleton />}><ReportCardsShell /></AuthGuard>;
}

function ReportCardsShell() {
  const tenant = useTenantMe();
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  if (tenant.isLoading || me.isLoading) return <PageSkeleton />;
  if (tenant.error || me.error || !tenant.data || !me.data) {
    return <main className="container mx-auto max-w-4xl px-4 py-10"><Alert variant="destructive"><AlertTitle>Tidak bisa memuat rapor</AlertTitle><AlertDescription>Coba muat ulang halaman.</AlertDescription></Alert></main>;
  }
  return (
    <SidebarLayout schoolName={tenant.data.school_name} userName={me.data.full_name} userEmail={me.data.email} isLoggingOut={logout.isPending} onLogout={async () => { await logout.mutateAsync(); router.push("/login"); }} className="mx-auto max-w-7xl">
      <div className="space-y-2"><h1 className="font-display text-3xl font-extrabold tracking-tight">Workflow Rapor</h1><p className="text-sm text-muted-foreground">Generate draft dari nilai, lalu jalankan submit, approval wali kelas, dan approval kepala sekolah.</p></div>
      <ReportCardsBoard />
    </SidebarLayout>
  );
}

function ReportCardsBoard() {
  const years = useAcademicYears();
  const homerooms = useHomerooms();
  const [yearId, setYearId] = React.useState("");
  const [homeroomId, setHomeroomId] = React.useState("");
  const cards = useReportCards(homeroomId, yearId);
  const roster = useHomeroomRoster(homeroomId);
  const generate = useGenerateReportCards();
  const activeYears = (years.data ?? []).filter((year) => year.status === "Active");
  const filteredHomerooms = (homerooms.data ?? []).filter((room) => !yearId || room.academic_year_id === yearId);
  const studentNameById = new Map((roster.data ?? []).map((student) => [student.student_id, student.full_name]));

  async function generateDrafts() {
    if (!homeroomId || !yearId) return;
    try {
      const result = await generate.mutateAsync({ homeroom_id: homeroomId, academic_year_id: yearId });
      toast.success(`${result.generated.length} draft dibuat/diperbarui. ${result.skipped.length} dilewati.`);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal generate draft rapor." }));
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Board Persetujuan</CardTitle><CardDescription>Pilih tahun dan kelas untuk melihat status rapor siswa.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <QuerySelect items={activeYears} isLoading={years.isLoading} value={yearId} onValueChange={(id) => { setYearId(id); setHomeroomId(""); }} getValue={(year) => year.academic_year_id} getLabel={(year) => year.name} placeholder="Pilih tahun aktif" emptyText="Belum ada tahun aktif" />
          <QuerySelect items={filteredHomerooms} isLoading={homerooms.isLoading} value={homeroomId} onValueChange={setHomeroomId} getValue={(room) => room.homeroom_id} getLabel={(room) => room.name} placeholder="Pilih kelas" emptyText="Belum ada kelas" />
          <Button loading={generate.isPending} disabled={!homeroomId || !yearId} onClick={generateDrafts}>Generate Draft</Button>
        </div>
        {!homeroomId || !yearId ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Pilih tahun dan kelas untuk membuka board rapor.</p> : null}
        {cards.isLoading ? <div className="grid gap-3 md:grid-cols-5">{statuses.map((status) => <Skeleton key={status} className="h-48 w-full" />)}</div> : null}
        {cards.data ? <div className="grid gap-3 md:grid-cols-5">{statuses.map((status) => <StatusColumn key={status} status={status} cards={cards.data.filter((card) => card.status === status)} homeroomId={homeroomId} academicYearId={yearId} studentNameById={studentNameById} />)}</div> : null}
      </CardContent>
    </Card>
  );
}

function StatusColumn({ status, cards, homeroomId, academicYearId, studentNameById }: { status: ReportCardStatus; cards: ReportCard[]; homeroomId: string; academicYearId: string; studentNameById: Map<string, string> }) {
  return <section className="rounded-xl border bg-muted/20 p-3"><h2 className="mb-3 text-sm font-semibold">{labels[status]} <span className="text-muted-foreground">({cards.length})</span></h2><div className="space-y-2">{cards.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada kartu.</p> : cards.map((card) => <ReportCardTile key={card.report_card_id} card={card} homeroomId={homeroomId} academicYearId={academicYearId} studentName={studentNameById.get(card.student_id)} />)}</div></section>;
}

function ReportCardTile({ card, homeroomId, academicYearId, studentName }: { card: ReportCard; homeroomId: string; academicYearId: string; studentName?: string }) {
  const transition = useTransitionReportCard(card.report_card_id, homeroomId, academicYearId);
  const action = actionForStatus(card.status);
  async function runAction() {
    if (!action) return;
    try {
      await transition.mutateAsync({ action });
      toast.success("Status rapor diperbarui.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Aksi rapor gagal. Periksa role dan status saat ini." }));
    }
  }
  return (
    <div className="rounded-lg border bg-background p-3 text-sm shadow-sm">
      <p className="font-medium">{studentName ?? "Siswa tidak ditemukan"}</p>
      <p className="text-xs text-muted-foreground">Rata-rata: {card.summary.average_score?.toFixed(1) ?? "-"}</p>
      {card.summary.incomplete ? <p className="text-xs text-amber-600">Nilai belum lengkap</p> : null}
      <div className="mt-3 flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link href={`/grading/report-cards/${card.report_card_id}`}>Detail</Link></Button>{action ? <Button size="sm" loading={transition.isPending} onClick={runAction}>{actionLabel(action)}</Button> : null}</div>
    </div>
  );
}

function actionForStatus(status: ReportCardStatus) {
  if (status === "Draft") return "submit" as const;
  if (status === "HomeroomReview") return "homeroom-approve" as const;
  if (status === "PrincipalApproval") return "principal-approve" as const;
  return null;
}

function actionLabel(action: "submit" | "homeroom-approve" | "principal-approve") {
  return action === "submit" ? "Submit" : action === "homeroom-approve" ? "Approve" : "Publish";
}

function PageSkeleton() { return <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10"><Skeleton className="h-9 w-56" /><Skeleton className="h-64 w-full" /></main>; }
