"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  AcademicSettingsPage,
  EntitlementTooltip,
} from "@/components/features/academic-config/academic-settings";
import { ApiHttpError } from "@/lib/api/types";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useCreateAcademicYear, useTransitionAcademicYear } from "@/lib/query/mutations/use-academic-config";
import { AcademicYear, useAcademicYears } from "@/lib/query/queries/use-academic-config";
import { academicYearSchema, AcademicYearForm } from "@/lib/schemas/academic-year";

const nextStatuses: Record<string, string[]> = {
  Planning: ["Configuration"],
  Configuration: ["Active"],
  Active: ["Locked"],
  Locked: ["Finalizing"],
  Finalizing: ["Closed"],
  Closed: ["Archived"],
  Archived: [],
};

export default function AcademicYearsPage() {
  return (
    <AcademicSettingsPage
      title="Tahun Ajaran"
      description="Kelola kalender akademik dan status lifecycle sebelum dipakai operasional."
    >
      {({ canManageAcademicConfig, upgradeMessage }) => (
        <AcademicYearsContent canManage={canManageAcademicConfig} upgradeMessage={upgradeMessage} />
      )}
    </AcademicSettingsPage>
  );
}

function AcademicYearsContent({ canManage, upgradeMessage }: { canManage: boolean; upgradeMessage: string }) {
  const years = useAcademicYears();
  const createYear = useCreateAcademicYear();
  const [open, setOpen] = React.useState(false);
  const form = useForm<AcademicYearForm>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: { name: "", start_date: "", end_date: "" },
  });

  async function onSubmit(values: AcademicYearForm) {
    try {
      await createYear.mutateAsync(values);
      form.reset();
      setOpen(false);
      toast.success("Tahun ajaran dibuat.");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) {
        toast.error(err instanceof ApiHttpError ? err.message : "Tidak bisa membuat tahun ajaran.");
      }
    }
  }

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-lg">Daftar Tahun Ajaran</CardTitle>
          <CardDescription>Hanya satu tahun ajaran yang boleh berstatus Active.</CardDescription>
        </div>
        <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
          <span>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canManage}>Buat Tahun Ajaran</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buat Tahun Ajaran</DialogTitle>
                  <DialogDescription>Mulai dari status Planning sebelum dikonfigurasi.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama</FormLabel>
                          <FormControl>
                            <Input placeholder="2026/2027" {...field} />
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
                            <FormLabel>Tanggal mulai</FormLabel>
                            <FormControl>
                              <DatePicker value={field.value} onChange={field.onChange} />
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
                            <FormLabel>Tanggal selesai</FormLabel>
                            <FormControl>
                              <DatePicker value={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" loading={createYear.isPending}>Simpan</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </span>
        </EntitlementTooltip>
      </CardHeader>
      <CardContent className="pt-6">
        {years.isLoading ? <YearsSkeleton /> : null}
        {years.error ? (
          <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
            Tidak bisa memuat tahun ajaran.
          </div>
        ) : null}
        {years.data?.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada tahun ajaran.
          </div>
        ) : null}
        {years.data?.length ? (
          <div className="divide-y rounded-lg border">
            {years.data.map((year) => (
              <YearRow key={year.academic_year_id} year={year} canManage={canManage} upgradeMessage={upgradeMessage} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function YearRow({ year, canManage, upgradeMessage }: { year: AcademicYear; canManage: boolean; upgradeMessage: string }) {
  const transition = useTransitionAcademicYear(year.academic_year_id);
  const options = React.useMemo(() => nextStatuses[year.status] ?? [], [year.status]);
  const [nextStatus, setNextStatus] = React.useState(options[0] ?? "");

  React.useEffect(() => {
    setNextStatus(options[0] ?? "");
  }, [year.status, options]);

  async function onTransition() {
    if (!nextStatus) return;
    try {
      await transition.mutateAsync({ status: nextStatus as never });
      toast.success("Status tahun ajaran diperbarui.");
    } catch (err) {
      toast.error(err instanceof ApiHttpError ? err.message : "Tidak bisa mengubah status.");
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{year.name}</h3>
          <Badge variant={year.status === "Active" ? "default" : "secondary"}>{year.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {year.start_date} sampai {year.end_date}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={nextStatus}
          onValueChange={setNextStatus}
          disabled={!canManage || options.length === 0 || transition.isPending}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tidak ada transisi" />
          </SelectTrigger>
          <SelectContent>
            {options.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
          <Button
            variant="outline"
            loading={transition.isPending}
            disabled={!canManage || !nextStatus || options.length === 0}
            onClick={onTransition}
          >
            Ubah Status
          </Button>
        </EntitlementTooltip>
      </div>
    </div>
  );
}

function YearsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
