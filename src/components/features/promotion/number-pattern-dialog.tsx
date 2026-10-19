"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatNumber } from "@/lib/promotion/letters";
import { numberPatternSchema, type NumberPatternForm } from "@/lib/schemas/promotion-letters";

export function NumberPatternDialog({
  open,
  onOpenChange,
  defaultCity,
  initial,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCity: string | null;
  initial: { letter_date: string; city: string };
  onApply: (values: NumberPatternForm) => void;
}) {
  const form = useForm<NumberPatternForm>({
    resolver: zodResolver(numberPatternSchema),
    defaultValues: { pattern: "", start: "1", digits: "3", letter_date: initial.letter_date, city: initial.city, overwrite: false },
  });

  React.useEffect(() => {
    if (open) form.reset({ ...form.getValues(), letter_date: initial.letter_date, city: initial.city, overwrite: false });
  }, [open, initial.letter_date, initial.city, form]);

  const pattern = form.watch("pattern");
  const start = Number(form.watch("start")) || 1;
  const digits = Number(form.watch("digits")) || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Isi nomor dari pola</DialogTitle>
          <DialogDescription>
            Nomor diurutkan per kelas lalu nama. Nomor yang sudah ada tidak diubah kecuali Anda memilih untuk menimpanya.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              onApply(values);
              onOpenChange(false);
            })}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="pattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabelRequired>Pola</FormLabelRequired>
                  <FormControl>
                    <Input {...field} placeholder="421.3/{n}/SKL/2026" />
                  </FormControl>
                  <FormMessage />
                  {pattern.includes("{n}") ? (
                    <p className="text-xs text-muted-foreground">Contoh: {formatNumber(pattern, start, digits)}</p>
                  ) : null}
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelRequired>Nomor awal</FormLabelRequired>
                    <FormControl>
                      <Input {...field} inputMode="numeric" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="digits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelRequired>Jumlah digit</FormLabelRequired>
                    <FormControl>
                      <Input {...field} inputMode="numeric" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <FormField
              control={form.control}
              name="overwrite"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                  </FormControl>
                  <FormLabel className="font-normal">Timpa nomor yang sudah ada</FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit">Isi nomor</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
