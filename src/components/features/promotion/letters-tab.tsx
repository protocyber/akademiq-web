"use client";

import * as React from "react";
import Link from "next/link";

import { CertificatesSection } from "@/components/features/promotion/certificates-section";
import { ClassLetterDialog } from "@/components/features/promotion/class-letter-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { formatDateTime } from "@/lib/date-utils";
import { getErrorMessage, PRINCIPAL_MISSING_MESSAGE } from "@/lib/errors/messages";
import { formatLetterDate } from "@/lib/promotion/letters";
import { useRefreshLetterPrincipal } from "@/lib/query/mutations/use-promotion-letters";
import { usePromotionLetters, type ClassLetterSummary } from "@/lib/query/queries/use-promotion-letters";

export function LettersTab({ runId, editable }: { runId: string; editable: boolean }) {
  const letters = usePromotionLetters(runId);
  const refresh = useRefreshLetterPrincipal(runId);
  const [editing, setEditing] = React.useState<ClassLetterSummary | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  if (letters.isLoading) return <Skeleton className="h-64 w-full" />;
  if (letters.error || !letters.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(letters.error, { fallback: "Tidak bisa memuat data surat." })}</AlertDescription>
      </Alert>
    );
  }

  const data = letters.data;
  const profile = data.school_profile;
  const hasPrincipal = Boolean(profile?.principal_name?.trim());
  const issuedCount = data.class_letters.filter((c) => c.letter).length + data.certificates.issued;

  async function onRefresh() {
    try {
      const outcome = await refresh.mutateAsync();
      toast.success(`${outcome.updated} surat memakai data kepala sekolah terbaru.`);
      setRefreshing(false);
    } catch (error) {
      toast.error(getErrorMessage(error, { fallback: "Gagal memperbarui data kepala sekolah." }));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle className="text-base">Data kepala sekolah</CardTitle>
          {editable && hasPrincipal && issuedCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setRefreshing(true)}>
              Perbarui data kepala sekolah
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          {hasPrincipal ? (
            <>
              <p>
                <span className="text-muted-foreground">Nama: </span>
                {profile!.principal_name}
              </p>
              <p>
                <span className="text-muted-foreground">NIP: </span>
                {profile!.principal_nip || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Kota: </span>
                {profile!.city_regency || "—"}
              </p>
            </>
          ) : (
            <Alert className="md:col-span-3">
              <AlertTitle>Kepala sekolah belum diisi</AlertTitle>
              <AlertDescription>
                {PRINCIPAL_MISSING_MESSAGE}{" "}
                <Link href="/settings/school-profile" className="underline">
                  Buka Profil Sekolah
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SK Kenaikan Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kelas</TableHead>
                <TableHead className="text-right">Naik / Tinggal / Lulus</TableHead>
                <TableHead>Nomor SK</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.class_letters.map((row) => (
                <TableRow key={row.homeroom_id}>
                  <TableCell className="font-medium">{row.homeroom_name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.counts.promote} / {row.counts.retain} / {row.counts.graduate}
                  </TableCell>
                  <TableCell>{row.letter?.letter_number ?? "—"}</TableCell>
                  <TableCell>{row.letter ? formatLetterDate(row.letter.letter_date) : "—"}</TableCell>
                  <TableCell>
                    {row.letter ? (
                      <span className="text-xs">
                        <Badge variant="secondary">Terbit</Badge> diubah {formatDateTime(row.letter.updated_at)}
                      </span>
                    ) : (
                      <Badge variant="outline">Belum terbit</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {editable ? (
                      <Button size="sm" variant="outline" disabled={!row.letter && !hasPrincipal} onClick={() => setEditing(row)}>
                        {row.letter ? "Ubah" : "Terbitkan"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!row.letter}
                      onClick={() =>
                        window.open(`/promotion/${runId}/print/class-letter/${row.homeroom_id}`, "_blank", "noopener")
                      }
                    >
                      Cetak
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data.certificates.graduates > 0 ? (
        <CertificatesSection
          runId={runId}
          editable={editable}
          hasPrincipal={hasPrincipal}
          defaultCity={profile?.city_regency ?? null}
        />
      ) : null}

      <ClassLetterDialog
        runId={runId}
        row={editing}
        defaultCity={profile?.city_regency ?? null}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <ConfirmDialog
        open={refreshing}
        onOpenChange={setRefreshing}
        title="Perbarui data kepala sekolah?"
        description={`${issuedCount} surat akan memakai data kepala sekolah terbaru (${profile?.principal_name ?? "—"}).`}
        confirmLabel="Perbarui"
        loading={refresh.isPending}
        onConfirm={onRefresh}
      />
    </div>
  );
}
