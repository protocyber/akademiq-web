"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { useTransitionReportCard } from "@/lib/query/mutations/use-grading";
import { useSubjectsForYear } from "@/lib/query/queries/use-academic-config";
import { useHomeroomRoster, useTeachers } from "@/lib/query/queries/use-academic-ops";
import { type ReportCardStatus, useReportCardDetail } from "@/lib/query/queries/use-grading";

type ReportCardTransitionAction = "submit" | "homeroom-approve" | "return" | "principal-approve" | "reject";

/**
 * The report-card detail body (workflow actions + frozen subject scores +
 * approval history). Shared by the per-class board's [Detail] modal and the
 * `/report-cards/[id]/print` route.
 */
export function ReportCardDetailBody({
  reportCardId,
  reportTypeId,
  homeroomId,
  showPrintLink = true,
}: {
  reportCardId: string;
  reportTypeId?: string;
  homeroomId?: string;
  showPrintLink?: boolean;
}) {
  const detail = useReportCardDetail(reportCardId);
  const card = detail.data?.report_card;
  const roster = useHomeroomRoster(card?.homeroom_id);
  const teachers = useTeachers();
  // Fetch subjects so we can show names instead of IDs in the score list.
  const subjects = useSubjectsForYear(card?.academic_year_id);

  if (detail.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (detail.error || !detail.data || !card) {
    return <p className="text-sm text-destructive">Rapor tidak bisa dimuat.</p>;
  }

  const studentName = (roster.data ?? []).find((s) => s.student_id === card.student_id)?.full_name;
  const teacherNameByUserId = new Map(
    (teachers.data ?? []).flatMap((teacher) => (teacher.user_id ? [[teacher.user_id, teacher.full_name] as const] : [])),
  );
  const subjectNameById = new Map(
    (subjects.data ?? []).map((s) => [s.subject_id, s.name]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">{studentName ?? "Siswa tidak ditemukan"}</p>
          <p className="text-xs text-muted-foreground">
            Status: <span className="font-semibold text-foreground">{statusLabel(card.status)}</span>
          </p>
        </div>
        {showPrintLink && (
          <Button asChild className="bg-emerald-700 text-white hover:bg-emerald-800">
            <a href={`/grading/report-cards/${reportCardId}/print`} target="_blank" rel="noopener noreferrer">
              Cetak Rapor
            </a>
          </Button>
        )}
      </div>
      <CurrentAction reportCardId={card.report_card_id} status={card.status} reportTypeId={reportTypeId} homeroomId={homeroomId} />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nilai dan Kelulusan</CardTitle>
            <CardDescription>Nilai final per mapel dibekukan saat Generate Draft; lulus/remedial mengacu kebijakan nilai minimum.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.data.subject_scores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada nilai yang dibekukan. Jalankan Generate Draft.</p>
            ) : (
              detail.data.subject_scores.map((score) => {
                const subjectRow = card.summary.subjects?.find((item) => item.subject_id === score.subject_id);
                const subjectName = subjectNameById.get(score.subject_id) ?? `Mapel #${score.subject_id.slice(-4)}`;
                return (
                  <div key={`${score.report_card_id}-${score.subject_id}`} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{subjectName}</p>
                      <p className="text-xs text-muted-foreground">Nilai akhir {score.final_score.toFixed(1)}</p>
                    </div>
                    <span className={subjectRow?.passed ? "text-emerald-600" : "text-destructive"}>
                      {subjectRow?.passed ? "Lulus" : "Remedial"}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Approval</CardTitle>
            <CardDescription>Audit trail setiap transisi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.data.approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada approval.</p>
            ) : (
              detail.data.approvals.map((approval) => (
                <div key={approval.approval_id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{approval.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel(approval.role)} oleh {teacherNameByUserId.get(approval.approver_id) ?? "Approver tidak ditemukan"}
                  </p>
                  {approval.note ? <p className="mt-1 text-xs">{approval.note}</p> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CurrentAction({ reportCardId, status, reportTypeId, homeroomId }: { reportCardId: string; status: ReportCardStatus; reportTypeId?: string; homeroomId?: string }) {
  const transition = useTransitionReportCard(reportCardId, reportTypeId, homeroomId);
  async function run(action: ReportCardTransitionAction) {
    try {
      await transition.mutateAsync({ action });
      toast.success("Status rapor diperbarui.");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Aksi rapor gagal." }));
    }
  }
  return (
    <Card>
      <CardContent className="flex flex-wrap gap-2 p-4">
        {status === "Draft" ? <Button loading={transition.isPending} onClick={() => run("submit")}>Submit ke Wali Kelas</Button> : null}
        {status === "HomeroomReview" ? (
          <>
            <Button loading={transition.isPending} onClick={() => run("homeroom-approve")}>Approve ke Kepala Sekolah</Button>
            <Button variant="outline" loading={transition.isPending} onClick={() => run("return")}>Return ke Draft</Button>
          </>
        ) : null}
        {status === "PrincipalApproval" ? (
          <>
            <Button loading={transition.isPending} onClick={() => run("principal-approve")}>Publish</Button>
            <Button variant="outline" loading={transition.isPending} onClick={() => run("reject")}>Reject ke Wali Kelas</Button>
          </>
        ) : null}
        {(status === "Published" || status === "Archived") ? (
          <p className="text-sm text-muted-foreground">Rapor sudah read-only.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function statusLabel(status: ReportCardStatus) {
  return status === "HomeroomReview"
    ? "Review Wali Kelas"
    : status === "PrincipalApproval"
      ? "Persetujuan Kepala Sekolah"
      : status;
}

function roleLabel(role: string) {
  if (role === "subject_teacher") return "Guru Mapel";
  if (role === "homeroom_teacher") return "Wali Kelas";
  if (role === "principal") return "Kepala Sekolah";
  return role;
}
