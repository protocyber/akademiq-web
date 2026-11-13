"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { AcademicYear } from "@/lib/query/queries/use-academic-config";

export function StepSource({
  years,
  isLoading,
  value,
  onChange,
  onStartEmpty,
}: {
  /** Years other than the target. */
  years: AcademicYear[];
  isLoading: boolean;
  value: string | undefined;
  onChange: (yearId: string) => void;
  onStartEmpty: () => void;
}) {
  if (isLoading) return <Skeleton className="h-10 w-full max-w-sm" />;
  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-2">
        <Label htmlFor="copy-source-year">Salin dari tahun ajaran</Label>
        <Select value={value} onValueChange={onChange} disabled={years.length === 0}>
          <SelectTrigger id="copy-source-year" aria-label="Tahun sumber">
            <SelectValue placeholder="Pilih tahun sumber" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y.academic_year_id} value={y.academic_year_id}>
                {y.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {years.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada tahun ajaran lain untuk disalin.</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Bawaan: tahun terbaru selain tahun tujuan.
          </p>
        )}
      </div>
      <div className="border-t pt-4">
        <p className="mb-2 text-sm text-muted-foreground">
          Tidak ingin menyalin apa pun? Tahun ajaran dibiarkan kosong.
        </p>
        <Button type="button" variant="outline" onClick={onStartEmpty}>
          Mulai kosong
        </Button>
      </div>
    </div>
  );
}
