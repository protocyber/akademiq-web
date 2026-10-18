"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { RESULT_LABEL } from "@/components/features/promotion/labels";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage, isApiError } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useOverrideDecision } from "@/lib/query/mutations/use-promotion";
import type { PromotionDecision } from "@/lib/query/queries/use-promotion";
import { PROMOTION_RESULTS, overrideSchema, type OverrideForm } from "@/lib/schemas/promotion";

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

export function OverrideDialog({
  runId,
  decision,
  open,
  onOpenChange,
}: {
  runId: string;
  decision: PromotionDecision | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const override = useOverrideDecision(runId);
  const [failure, setFailure] = React.useState<unknown>(null);
  const schema = React.useMemo(() => overrideSchema(decision?.recommended ?? "promote"), [decision]);
  const form = useForm<OverrideForm>({
    resolver: zodResolver(schema),
    defaultValues: { result: decision?.result ?? "promote", reason: decision?.reason ?? "" },
  });

  React.useEffect(() => {
    if (open && decision) {
      form.reset({ result: decision.result, reason: decision.reason ?? "" });
      setFailure(null);
    }
  }, [open, decision, form]);

  if (!decision) return null;
  const result = form.watch("result");
  const needsReason = result !== decision.recommended;

  async function onSubmit(values: OverrideForm) {
    setFailure(null);
    try {
      await override.mutateAsync({ decisionId: decision!.decision_id, result: values.result, reason: values.reason });
      toast.success("Keputusan diperbarui.");
      onOpenChange(false);
    } catch (error) {
      if (applyServerFieldErrors(form, error).length === 0) setFailure(error);
    }
  }

  const m = decision.computed_metrics;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah keputusan — {decision.full_name ?? "—"}</DialogTitle>
          <DialogDescription>
            Rekomendasi: {RESULT_LABEL[decision.recommended]}. Rata-rata {formatScore(m.average)}, {m.subjects_below_kkm} dari{" "}
            {m.subjects_counted} mapel di bawah KKM {formatScore(m.kkm_used)}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="result"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasil</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="Hasil">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROMOTION_RESULTS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {RESULT_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alasan{needsReason ? " *" : ""}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={needsReason ? "Minimal 10 karakter" : "Tidak perlu: hasil sama dengan rekomendasi"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {failure ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {getErrorMessage(failure, { fallback: "Keputusan gagal disimpan." })}
                  {isApiError(failure, "PROMOTION_RUN_INVALID_STATUS") ? " Data evaluasi sudah dimuat ulang." : null}
                </AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" loading={override.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
