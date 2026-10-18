"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage, isApiError, promotionFieldGroups } from "@/lib/errors/messages";
import { useCreatePromotionRun, useReevaluatePromotionRun } from "@/lib/query/mutations/use-promotion";
import type { PromotionCriteria } from "@/lib/query/queries/use-promotion";
import { criteriaFormSchema, criteriaToForm, toCriteriaPayload, type CriteriaForm } from "@/lib/schemas/promotion";

const CRITERIA_FIELDS = new Set(["min_average", "max_subjects_below_kkm", "min_attendance_percent"]);

export function CriteriaDialog({
  open,
  onOpenChange,
  mode,
  academicYearId,
  runId,
  initial,
  overriddenCount = 0,
  existingRunId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "reevaluate";
  academicYearId?: string;
  runId?: string;
  initial?: PromotionCriteria;
  overriddenCount?: number;
  existingRunId?: string;
  onCreated?: (runId: string) => void;
}) {
  const create = useCreatePromotionRun();
  const reevaluate = useReevaluatePromotionRun(runId ?? "");
  const [failure, setFailure] = React.useState<unknown>(null);
  const form = useForm<CriteriaForm>({
    resolver: zodResolver(criteriaFormSchema),
    defaultValues: initial ? criteriaToForm(initial) : { min_average: "", max_subjects_below_kkm: "" },
  });

  React.useEffect(() => {
    if (open) {
      form.reset(initial ? criteriaToForm(initial) : { min_average: "", max_subjects_below_kkm: "" });
      setFailure(null);
    }
  }, [open, initial, form]);

  const pending = create.isPending || reevaluate.isPending;

  async function onSubmit(values: CriteriaForm) {
    setFailure(null);
    const payload = toCriteriaPayload(values);
    try {
      if (mode === "create") {
        const outcome = await create.mutateAsync({ ...payload, academic_year_id: academicYearId! });
        toast.success("Evaluasi dibuat.");
        onOpenChange(false);
        onCreated?.(outcome.run_id);
      } else {
        const outcome = await reevaluate.mutateAsync(payload);
        toast.success(
          outcome.discarded_overrides > 0
            ? `Evaluasi diulang. ${outcome.discarded_overrides} keputusan override hilang.`
            : "Evaluasi diulang.",
        );
        onOpenChange(false);
      }
    } catch (error) {
      const groups = promotionFieldGroups(error);
      for (const group of groups) {
        if (CRITERIA_FIELDS.has(group.field)) {
          form.setError(group.field as keyof CriteriaForm, { type: "server", message: group.messages[0] });
        }
      }
      setFailure(error);
    }
  }

  const preconditions = promotionFieldGroups(failure).filter((g) => !CRITERIA_FIELDS.has(g.field));
  const exists = isApiError(failure, "PROMOTION_RUN_EXISTS");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Buat evaluasi kenaikan kelas" : "Evaluasi ulang"}</DialogTitle>
          <DialogDescription>
            Kriteria yang kosong dilewati. Semua kriteria yang diisi harus terpenuhi agar siswa naik kelas.
          </DialogDescription>
        </DialogHeader>
        {mode === "reevaluate" && overriddenCount > 0 ? (
          <Alert>
            <AlertTitle>Override akan hilang</AlertTitle>
            <AlertDescription>
              {overriddenCount} keputusan yang di-override akan hilang dan dihitung ulang dari nilai.
            </AlertDescription>
          </Alert>
        ) : null}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="min_average"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rata-rata minimum</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="mis. 70" {...field} />
                  </FormControl>
                  <FormDescription>Siswa tinggal kelas bila rata-rata nilai akhirnya di bawah angka ini.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="max_subjects_below_kkm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maksimum mapel di bawah KKM</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="mis. 2" {...field} />
                  </FormControl>
                  <FormDescription>Siswa tinggal kelas bila jumlah mapel di bawah KKM lebih dari angka ini.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none text-muted-foreground">Kehadiran minimum</p>
              <Input disabled placeholder="Belum tersedia" aria-label="Kehadiran minimum" />
              <p className="text-xs text-muted-foreground">Menunggu modul absensi.</p>
            </div>
            {exists ? (
              <Alert variant="destructive">
                <AlertTitle>{getErrorMessage(failure)}</AlertTitle>
                {existingRunId ? (
                  <AlertDescription>
                    <Link href={`/promotion/${existingRunId}`} className="underline">
                      Buka evaluasi berjalan
                    </Link>
                  </AlertDescription>
                ) : null}
              </Alert>
            ) : preconditions.length > 0 ? (
              <Alert variant="destructive">
                <AlertTitle>Evaluasi belum bisa dijalankan</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {preconditions.map((group) => (
                      <li key={group.field}>
                        <span className="font-medium">{group.label}:</span> {group.messages.join("; ")}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : failure && !isApiError(failure, "VALIDATION_ERROR") ? (
              <Alert variant="destructive">
                <AlertDescription>{getErrorMessage(failure, { fallback: "Evaluasi gagal." })}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" loading={pending}>
                {mode === "create" ? "Jalankan evaluasi" : "Evaluasi ulang"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
