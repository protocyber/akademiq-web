"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { AcademicSettingsPage, EntitlementTooltip, YearPicker } from "@/components/features/academic-config/academic-settings";
import { ApiHttpError } from "@/lib/api/types";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useUpsertGradingPolicy } from "@/lib/query/mutations/use-academic-config";
import { useAcademicYears, useGradingPolicy } from "@/lib/query/queries/use-academic-config";
import { gradingPolicySchema, GradingPolicyForm } from "@/lib/schemas/grading-policy";

export default function GradingPolicyPage() {
  return (
    <AcademicSettingsPage
      title="Kebijakan Nilai"
      description="Tetapkan skala nilai dan batas kelulusan per tahun ajaran."
    >
      {({ canManageAcademicConfig, upgradeMessage }) => (
        <GradingPolicyContent canManage={canManageAcademicConfig} upgradeMessage={upgradeMessage} />
      )}
    </AcademicSettingsPage>
  );
}

function GradingPolicyContent({ canManage, upgradeMessage }: { canManage: boolean; upgradeMessage: string }) {
  const years = useAcademicYears();
  const [yearId, setYearId] = React.useState("");
  const policy = useGradingPolicy(yearId);
  const upsertPolicy = useUpsertGradingPolicy(yearId);
  const form = useForm<GradingPolicyForm>({
    resolver: zodResolver(gradingPolicySchema),
    defaultValues: {
      academic_year_id: "",
      minimum_passing_score: 75,
      grading_scale: "0-100",
    },
  });

  React.useEffect(() => {
    if (!yearId && years.data?.[0]) setYearId(years.data[0].academic_year_id);
  }, [yearId, years.data]);

  React.useEffect(() => {
    form.register("academic_year_id");
    form.reset({
      academic_year_id: yearId,
      minimum_passing_score: policy.data?.minimum_passing_score ?? 75,
      grading_scale: (policy.data?.grading_scale as GradingPolicyForm["grading_scale"] | undefined) ?? "0-100",
    });
  }, [form, policy.data, yearId]);

  async function onSubmit(values: GradingPolicyForm) {
    try {
      const { academic_year_id: _academicYearId, ...input } = values;
      await upsertPolicy.mutateAsync(input);
      toast.success("Kebijakan nilai disimpan.");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) toast.error(err instanceof ApiHttpError ? err.message : "Tidak bisa menyimpan kebijakan nilai.");
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-lg">Form Kebijakan Nilai</CardTitle>
        <CardDescription>Perubahan akan mengganti policy aktif untuk tahun ajaran yang dipilih.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <YearPicker years={years.data ?? []} isLoading={years.isLoading} value={yearId} onChange={setYearId} />
        {policy.isLoading ? <Skeleton className="h-32 w-full" /> : null}
        {policy.error instanceof ApiHttpError && policy.error.status !== 404 ? (
          <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
            {policy.error.message}
          </p>
        ) : null}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="minimum_passing_score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum passing score</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="100" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grading_scale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skala nilai</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger onBlur={field.onBlur} ref={field.ref}>
                        <SelectValue placeholder="Pilih skala nilai" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0-100">0-100</SelectItem>
                      <SelectItem value="A-E">A-E</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-2">
              <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
                <Button type="submit" loading={upsertPolicy.isPending} disabled={!canManage || !yearId}>Simpan Kebijakan</Button>
              </EntitlementTooltip>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
