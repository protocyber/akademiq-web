"use client";

import * as React from "react";

import { NumberPatternDialog } from "@/components/features/promotion/number-pattern-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { ApiHttpError } from "@/lib/api/types";
import { getErrorMessage, letterNumberMessage, promotionFieldGroups } from "@/lib/errors/messages";
import {
  buildCertificateNumbers,
  certificateChanges,
  duplicateNumbers,
  effectiveNumber,
  formatLetterDate,
  mapStudentErrors,
  orderGraduates,
  type CertificateDraft,
} from "@/lib/promotion/letters";
import { withStudentNames } from "@/lib/promotion/placement";
import { useIssueCertificates } from "@/lib/query/mutations/use-promotion-letters";
import { useCertificatesPrint } from "@/lib/query/queries/use-promotion-letters";
import { toCityPayload, type NumberPatternForm } from "@/lib/schemas/promotion-letters";

export function CertificatesSection({
  runId,
  editable,
  hasPrincipal,
  defaultCity,
}: {
  runId: string;
  editable: boolean;
  hasPrincipal: boolean;
  defaultCity: string | null;
}) {
  const list = useCertificatesPrint(runId);
  const save = useIssueCertificates(runId);
  const [draft, setDraft] = React.useState<CertificateDraft>({});
  const [meta, setMeta] = React.useState<{ letter_date: string; city: string } | null>(null);
  const [patternOpen, setPatternOpen] = React.useState(false);
  const [rowErrors, setRowErrors] = React.useState<Record<string, string[]>>({});
  const [failure, setFailure] = React.useState<string[]>([]);

  const rows = React.useMemo(() => orderGraduates(list.data?.certificates ?? []), [list.data]);
  const changes = React.useMemo(() => certificateChanges(rows, draft), [rows, draft]);
  const duplicates = React.useMemo(() => duplicateNumbers(rows, draft), [rows, draft]);
  const dirty = changes.length > 0;

  React.useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (list.isLoading) return <Skeleton className="h-48 w-full" />;
  if (list.error || !list.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(list.error, { fallback: "Tidak bisa memuat daftar lulusan." })}</AlertDescription>
      </Alert>
    );
  }
  if (rows.length === 0) return null;

  // Date/city for the next save: the pattern dialog's, else the last issued certificate's.
  const issued = rows.find((r) => r.letter_date);
  const current = meta ?? { letter_date: issued?.letter_date ?? "", city: "" };
  const names = new Map(rows.map((r) => [r.student_id, r.full_name ?? r.student_id]));

  function applyPattern(values: NumberPatternForm) {
    setDraft((d) =>
      buildCertificateNumbers(rows, d, {
        pattern: values.pattern,
        start: Number(values.start),
        digits: Number(values.digits),
        overwrite: values.overwrite,
      }),
    );
    setMeta({ letter_date: values.letter_date, city: values.city });
    setRowErrors({});
  }

  async function onSave() {
    if (!current.letter_date) {
      setPatternOpen(true);
      return;
    }
    setRowErrors({});
    setFailure([]);
    try {
      const outcome = await save.mutateAsync({
        letter_date: current.letter_date,
        city: toCityPayload(current.city),
        items: changes,
      });
      toast.success(`${outcome.updated} nomor surat disimpan.`);
      setDraft({});
    } catch (error) {
      const items = error instanceof ApiHttpError ? (error.fields?.items ?? []) : [];
      const { byStudent, unmatched } = mapStudentErrors(items, new Set(rows.map((r) => r.student_id)));
      setRowErrors(byStudent);
      const other = promotionFieldGroups(error)
        .filter((g) => g.field !== "items")
        .flatMap((g) => g.messages.map((m) => `${g.label}: ${m}`));
      const lines = [...unmatched.map((m) => withStudentNames(m, names)), ...other];
      setFailure(lines.length > 0 || Object.keys(byStudent).length > 0 ? lines : [getErrorMessage(error, { fallback: "Nomor surat gagal disimpan." })]);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Surat Keterangan Lulus</CardTitle>
          <p className="text-xs text-muted-foreground">
            {current.letter_date ? `Tanggal surat ${formatLetterDate(current.letter_date)}` : "Tanggal surat belum diisi"}
            {current.city ? ` · ${current.city}` : defaultCity ? ` · ${defaultCity}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {editable ? (
            <>
              <Button size="sm" variant="outline" disabled={!hasPrincipal} onClick={() => setPatternOpen(true)}>
                Isi nomor dari pola
              </Button>
              <Button size="sm" disabled={!dirty || duplicates.size > 0 || !hasPrincipal} loading={save.isPending} onClick={onSave}>
                Simpan nomor
              </Button>
            </>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            disabled={dirty || !rows.some((r) => r.certificate_number)}
            onClick={() => window.open(`/promotion/${runId}/print/certificates`, "_blank", "noopener")}
          >
            Cetak semua
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {dirty ? <Badge variant="outline">{changes.length} perubahan belum disimpan</Badge> : null}
        {failure.length > 0 ? (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc pl-4">
                {failure.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>NIS</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead>Nomor surat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const value = effectiveNumber(row, draft);
              const errors = [
                ...(duplicates.has(row.student_id) ? ["Nomor dipakai dua kali"] : []),
                ...(rowErrors[row.student_id] ?? []).map(letterNumberMessage),
              ];
              return (
                <TableRow key={row.student_id}>
                  <TableCell className="font-medium">{row.full_name ?? "—"}</TableCell>
                  <TableCell>{row.nis ?? "—"}</TableCell>
                  <TableCell>{row.last_homeroom_name ?? "—"}</TableCell>
                  <TableCell>
                    {editable ? (
                      <Input
                        aria-label={`Nomor surat ${row.full_name ?? row.student_id}`}
                        aria-invalid={errors.length > 0}
                        value={value}
                        onChange={(e) => setDraft((d) => ({ ...d, [row.student_id]: e.target.value }))}
                        className="h-8"
                      />
                    ) : (
                      <span>{row.certificate_number ?? "—"}</span>
                    )}
                    {errors.map((message, i) => (
                      <p key={i} className="mt-1 text-xs text-destructive">
                        {message}
                      </p>
                    ))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!row.certificate_number || row.student_id in draft}
                      onClick={() =>
                        window.open(`/promotion/${runId}/print/certificates?student=${row.student_id}`, "_blank", "noopener")
                      }
                    >
                      Cetak
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <NumberPatternDialog
        open={patternOpen}
        onOpenChange={setPatternOpen}
        defaultCity={defaultCity}
        initial={current}
        onApply={applyPattern}
      />
    </Card>
  );
}
