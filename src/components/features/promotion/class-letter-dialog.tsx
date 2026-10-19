"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormLabelRequired, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { ApiHttpError } from "@/lib/api/types";
import { getErrorMessage, letterNumberMessage } from "@/lib/errors/messages";
import { useIssueClassLetter } from "@/lib/query/mutations/use-promotion-letters";
import type { ClassLetterSummary } from "@/lib/query/queries/use-promotion-letters";
import { classLetterSchema, toCityPayload, type ClassLetterForm } from "@/lib/schemas/promotion-letters";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ClassLetterDialog({
  runId,
  row,
  defaultCity,
  open,
  onOpenChange,
}: {
  runId: string;
  row: ClassLetterSummary | null;
  defaultCity: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const issue = useIssueClassLetter(runId);
  const [failure, setFailure] = React.useState<unknown>(null);
  const form = useForm<ClassLetterForm>({
    resolver: zodResolver(classLetterSchema),
    defaultValues: { letter_number: "", letter_date: today(), city: "" },
  });

  React.useEffect(() => {
    if (open && row) {
      form.reset({
        letter_number: row.letter?.letter_number ?? "",
        letter_date: row.letter?.letter_date ?? today(),
        city: row.letter?.city ?? "",
      });
      setFailure(null);
    }
  }, [open, row, form]);

  if (!row) return null;

  async function onSubmit(values: ClassLetterForm) {
    setFailure(null);
    try {
      await issue.mutateAsync({
        homeroomId: row!.homeroom_id,
        letter_number: values.letter_number,
        letter_date: values.letter_date,
        city: toCityPayload(values.city),
      });
      toast.success(row!.letter ? "SK diperbarui." : "SK diterbitkan.");
      onOpenChange(false);
    } catch (error) {
      const fields = error instanceof ApiHttpError ? error.fields : undefined;
      let applied = false;
      for (const key of ["letter_number", "letter_date", "city"] as const) {
        const message = fields?.[key]?.[0];
        if (message) {
          form.setError(key, { type: "server", message: letterNumberMessage(message) });
          applied = true;
        }
      }
      if (!applied || fields?.principal) setFailure(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row.letter ? "Ubah" : "Terbitkan"} SK — {row.homeroom_name ?? "—"}</DialogTitle>
          <DialogDescription>
            Nama sekolah dan kepala sekolah diambil saat SK pertama kali diterbitkan dan tidak berubah saat SK dikoreksi.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="letter_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabelRequired>Nomor SK</FormLabelRequired>
                  <FormControl>
                    <Input {...field} placeholder="421/001/SK/2026" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="letter_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabelRequired>Tanggal surat</FormLabelRequired>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kota</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={defaultCity ?? "Kota penerbitan"} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {failure ? (
              <Alert variant="destructive">
                <AlertDescription>{getErrorMessage(failure, { fallback: "SK gagal disimpan." })}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" loading={issue.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
