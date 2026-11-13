"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { ShiftedTerm } from "./checklist";

export function StepTermDates({
  terms,
  isLoading,
  onChange,
  error,
}: {
  terms: ShiftedTerm[];
  isLoading: boolean;
  onChange: (sourceTermId: string, patch: { start_date?: string; end_date?: string }) => void;
  error: string | null;
}) {
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tanggal digeser mengikuti selisih tahun mulai. Ubah bila perlu.
      </p>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {terms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tahun sumber tidak punya semester.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Semester</TableHead>
              <TableHead>Mulai</TableHead>
              <TableHead>Selesai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms.map((t) => (
              <TableRow key={t.source_term_id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  <Input
                    type="date"
                    aria-label={`Mulai ${t.name}`}
                    value={t.start_date}
                    onChange={(e) => onChange(t.source_term_id, { start_date: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    aria-label={`Selesai ${t.name}`}
                    value={t.end_date}
                    onChange={(e) => onChange(t.source_term_id, { end_date: e.target.value })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground">
        Semester 1 otomatis di tahun tujuan hanya disesuaikan bila semester sumber bernama
        &quot;Semester 1&quot;/&quot;Semester 2&quot;; kalau tidak, hapus dulu semester kosong bawaan.
      </p>
    </div>
  );
}
