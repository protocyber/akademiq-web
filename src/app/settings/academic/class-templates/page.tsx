"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { AcademicSettingsPage, EntitlementTooltip, YearPicker } from "@/components/features/academic-config/academic-settings";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useAddClassTemplate } from "@/lib/query/mutations/use-academic-config";
import { useAcademicYears, useClassTemplates } from "@/lib/query/queries/use-academic-config";
import { classTemplateSchema, ClassTemplateForm } from "@/lib/schemas/class-template";

export default function ClassTemplatesPage() {
  return (
    <AcademicSettingsPage
      title="Template Kelas"
      description="Siapkan tingkat kelas dan kapasitas default untuk Academic Ops."
    >
      {({ canManageAcademicConfig, upgradeMessage }) => (
        <ClassTemplatesContent canManage={canManageAcademicConfig} upgradeMessage={upgradeMessage} />
      )}
    </AcademicSettingsPage>
  );
}

function ClassTemplatesContent({ canManage, upgradeMessage }: { canManage: boolean; upgradeMessage: string }) {
  const years = useAcademicYears();
  const [yearId, setYearId] = React.useState("");
  const templates = useClassTemplates(yearId);
  const addTemplate = useAddClassTemplate(yearId);
  const form = useForm<ClassTemplateForm>({
    resolver: zodResolver(classTemplateSchema),
    defaultValues: { academic_year_id: "", grade_level: "", default_capacity: 30 },
  });

  React.useEffect(() => {
    if (!yearId && years.data?.[0]) setYearId(years.data[0].academic_year_id);
  }, [yearId, years.data]);

  React.useEffect(() => {
    form.register("academic_year_id");
    form.setValue("academic_year_id", yearId);
  }, [form, yearId]);

  async function onSubmit(values: ClassTemplateForm) {
    try {
      const { academic_year_id: _academicYearId, ...input } = values;
      await addTemplate.mutateAsync(input);
      form.reset({ academic_year_id: yearId, grade_level: "", default_capacity: 30 });
      toast.success("Template kelas ditambahkan.");
    } catch (err) {
      const applied = applyServerFieldErrors(form, err);
      if (applied.length === 0) toast.error(getErrorMessage(err, { fallback: "Tidak bisa menambah template kelas." }));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tambah Template</CardTitle>
          <CardDescription>Template bersifat advisory untuk pembuatan rombel di fase berikutnya.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <YearPicker years={years.data ?? []} isLoading={years.isLoading} value={yearId} onChange={setYearId} />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="grade_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tingkat kelas</FormLabel>
                    <FormControl>
                      <Input placeholder="Kelas 7" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kapasitas default</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
                <Button type="submit" loading={addTemplate.isPending} disabled={!canManage || !yearId}>Tambah Template</Button>
              </EntitlementTooltip>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daftar Template</CardTitle>
          <CardDescription>Template untuk tahun ajaran terpilih.</CardDescription>
        </CardHeader>
        <CardContent>
          {templates.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : null}
          {templates.data?.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Belum ada template kelas.
            </div>
          ) : null}
          {templates.data?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.data.map((template) => (
                <div key={template.template_id} className="rounded-lg border p-4">
                  <p className="font-semibold text-foreground">{template.grade_level}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Kapasitas {template.default_capacity} siswa</p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
