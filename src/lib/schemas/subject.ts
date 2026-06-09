import { z } from "zod";

export const curriculumVersionSchema = z.object({
  name: z.string().min(1, "Nama kurikulum wajib diisi"),
  description: z.string().optional(),
});

export const subjectSchema = z.object({
  curriculum_version_id: z.string().uuid("Pilih kurikulum terlebih dahulu"),
  name: z.string().min(1, "Nama mata pelajaran wajib diisi"),
  code: z.string().optional(),
  passing_grade: z.coerce.number().min(0, "Minimal 0").max(100, "Maksimal 100"),
});

export type CurriculumVersionForm = z.infer<typeof curriculumVersionSchema>;
export type SubjectForm = z.infer<typeof subjectSchema>;
