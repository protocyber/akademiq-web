"use client";

import type { UseFormReturn } from "react-hook-form";

import { Form, FormControl, FormField, FormItem, FormLabelRequired, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { AcademicYearForm } from "@/lib/schemas/academic-year";

export function StepIdentity({
  form,
  locked,
  onSubmit,
}: {
  form: UseFormReturn<AcademicYearForm>;
  /** The year already exists (created on an earlier `Lanjut`). */
  locked: boolean;
  onSubmit: () => void;
}) {
  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        {locked ? (
          <p className="text-sm text-muted-foreground">
            Tahun ajaran sudah dibuat. Ubah detailnya lewat Pengaturan Akademik.
          </p>
        ) : null}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabelRequired>Nama</FormLabelRequired>
              <FormControl>
                <Input placeholder="contoh: 2026/2027" disabled={locked} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabelRequired>Tanggal mulai</FormLabelRequired>
                <FormControl>
                  <Input type="date" disabled={locked} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabelRequired>Tanggal selesai</FormLabelRequired>
                <FormControl>
                  <Input type="date" disabled={locked} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
