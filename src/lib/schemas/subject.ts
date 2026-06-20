import { z } from "zod";

export const curriculumVersionSchema = z.object({
  name: z.string().min(1, "Nama kurikulum wajib diisi"),
  description: z.string().optional(),
});

export const subjectGroupSchema = z.object({
  name: z.string().min(1, "Nama kelompok wajib diisi"),
  code: z.string().optional(),
  position: z.coerce.number().int().min(1, "Posisi minimal 1"),
});

export const subjectSchema = z.object({
  curriculum_version_id: z.string().uuid("Pilih kurikulum terlebih dahulu"),
  subject_group_id: z.string().min(1, "Pilih kelompok terlebih dahulu"),
  name: z.string().min(1, "Nama mata pelajaran wajib diisi"),
  code: z.string().optional(),
  passing_grade: z.coerce.number().min(0, "Minimal 0").max(100, "Maksimal 100"),
});

export type CurriculumVersionForm = z.infer<typeof curriculumVersionSchema>;
export type SubjectGroupForm = z.infer<typeof subjectGroupSchema>;
export type SubjectForm = z.infer<typeof subjectSchema>;
