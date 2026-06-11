"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { QuerySelect } from "@/components/ui/query-select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { AcademicSettingsPage, EntitlementTooltip, YearPicker } from "@/components/features/academic-config/academic-settings";
import { getErrorMessage } from "@/lib/errors/messages";
import { applyServerFieldErrors } from "@/lib/forms/apply-server-field-errors";
import { useAddCurriculumVersion, useAddSubject } from "@/lib/query/mutations/use-academic-config";
import { useAcademicYears, useCurriculumVersions, useSubjects } from "@/lib/query/queries/use-academic-config";
import { curriculumVersionSchema, CurriculumVersionForm, subjectSchema, SubjectForm } from "@/lib/schemas/subject";

export default function AcademicCurriculumPage() {
  return (
    <AcademicSettingsPage
      title="Kurikulum"
      description="Kelola versi kurikulum dan daftar mata pelajaran per tahun ajaran."
    >
      {({ canManageAcademicConfig, upgradeMessage }) => (
        <CurriculumContent canManage={canManageAcademicConfig} upgradeMessage={upgradeMessage} />
      )}
    </AcademicSettingsPage>
  );
}

function CurriculumContent({ canManage, upgradeMessage }: { canManage: boolean; upgradeMessage: string }) {
  const years = useAcademicYears();
  const [yearId, setYearId] = React.useState("");
  const curriculum = useCurriculumVersions(yearId);
  const [curriculumId, setCurriculumId] = React.useState("");
  const subjects = useSubjects(curriculumId);
  const addCurriculum = useAddCurriculumVersion(yearId);
  const addSubject = useAddSubject(curriculumId);
  const curriculumForm = useForm<CurriculumVersionForm>({
    resolver: zodResolver(curriculumVersionSchema),
    defaultValues: { name: "", description: "" },
  });
  const subjectForm = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { curriculum_version_id: "", name: "", code: "", passing_grade: 75 },
  });

  React.useEffect(() => {
    if (!yearId && years.data?.[0]) setYearId(years.data[0].academic_year_id);
  }, [yearId, years.data]);

  React.useEffect(() => {
    const first = curriculum.data?.[0]?.curriculum_version_id ?? "";
    setCurriculumId((current) => (current && curriculum.data?.some((c) => c.curriculum_version_id === current) ? current : first));
  }, [curriculum.data]);

  React.useEffect(() => {
    subjectForm.register("curriculum_version_id");
    subjectForm.setValue("curriculum_version_id", curriculumId);
  }, [curriculumId, subjectForm]);

  async function onAddCurriculum(values: CurriculumVersionForm) {
    try {
      await addCurriculum.mutateAsync(values);
      curriculumForm.reset({ name: "", description: "" });
      toast.success("Kurikulum ditambahkan.");
    } catch (err) {
      const applied = applyServerFieldErrors(curriculumForm, err);
      if (applied.length === 0) toast.error(getErrorMessage(err, { fallback: "Tidak bisa menambah kurikulum." }));
    }
  }

  async function onAddSubject(values: SubjectForm) {
    try {
      const { curriculum_version_id: _curriculumVersionId, ...input } = values;
      await addSubject.mutateAsync(input);
      subjectForm.reset({ curriculum_version_id: curriculumId, name: "", code: "", passing_grade: 75 });
      toast.success("Mata pelajaran ditambahkan.");
    } catch (err) {
      const applied = applyServerFieldErrors(subjectForm, err);
      if (applied.length === 0) toast.error(getErrorMessage(err, { fallback: "Tidak bisa menambah mata pelajaran." }));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Versi Kurikulum</CardTitle>
          <CardDescription>Pilih tahun ajaran, lalu tambahkan versi kurikulum.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <YearPicker years={years.data ?? []} isLoading={years.isLoading} value={yearId} onChange={setYearId} />
          <Form {...curriculumForm}>
            <form onSubmit={curriculumForm.handleSubmit(onAddCurriculum)} className="space-y-4 rounded-lg border p-4">
              <FormField
                control={curriculumForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama kurikulum</FormLabel>
                    <FormControl><Input placeholder="Kurikulum Merdeka" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={curriculumForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl><Input placeholder="Opsional" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
                <Button type="submit" loading={addCurriculum.isPending} disabled={!canManage || !yearId}>Tambah Kurikulum</Button>
              </EntitlementTooltip>
            </form>
          </Form>
          <div className="space-y-2">
            {curriculum.isLoading ? <Skeleton className="h-20 w-full" /> : null}
            {curriculum.data?.map((item) => (
              <Button
                key={item.curriculum_version_id}
                type="button"
                variant="outline"
                onClick={() => setCurriculumId(item.curriculum_version_id)}
                className={`h-auto w-full justify-start rounded-lg p-3 text-left text-sm ${curriculumId === item.curriculum_version_id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
              >
                <span className="block font-semibold">{item.name}</span>
                {item.description ? <span className="mt-1 block text-muted-foreground">{item.description}</span> : null}
              </Button>
            ))}
            {curriculum.data?.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada kurikulum.</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mata Pelajaran</CardTitle>
          <CardDescription>Passing grade dipakai sebagai aturan awal penilaian.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <QuerySelect
            items={curriculum.data ?? []}
            isLoading={curriculum.isLoading}
            value={curriculumId}
            onValueChange={setCurriculumId}
            getValue={(item) => item.curriculum_version_id}
            getLabel={(item) => item.name}
            placeholder="Pilih kurikulum"
            emptyText="Belum ada kurikulum"
          />
          <Form {...subjectForm}>
            <form onSubmit={subjectForm.handleSubmit(onAddSubject)} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
              <FormField
                control={subjectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama pelajaran</FormLabel>
                    <FormControl><Input placeholder="Matematika" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subjectForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode</FormLabel>
                    <FormControl><Input placeholder="MTK" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subjectForm.control}
                name="passing_grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passing grade</FormLabel>
                    <FormControl><Input type="number" min="0" max="100" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end">
                <EntitlementTooltip enabled={canManage} message={upgradeMessage}>
                  <Button type="submit" className="w-full" loading={addSubject.isPending} disabled={!canManage || !curriculumId}>Tambah Pelajaran</Button>
                </EntitlementTooltip>
              </div>
            </form>
          </Form>
          <div className="divide-y rounded-lg border">
            {subjects.isLoading ? <Skeleton className="m-4 h-20" /> : null}
            {subjects.data?.map((subject) => (
              <div key={subject.subject_id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-semibold">{subject.name}</p>
                  <p className="text-muted-foreground">{subject.code || "Tanpa kode"}</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">KKM {subject.passing_grade}</span>
              </div>
            ))}
            {subjects.data?.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Belum ada mata pelajaran.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
