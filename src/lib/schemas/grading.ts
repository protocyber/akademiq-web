import { z } from "zod";

const uuid = z.string().uuid();

export const evaluationSchema = z.object({
  homeroom_id: uuid,
  subject_id: uuid,
  academic_year_id: uuid,
  code: z.string().min(1, "Kode wajib diisi").max(32, "Kode maksimal 32 karakter"),
  name: z.string().min(1, "Nama wajib diisi").max(255, "Nama maksimal 255 karakter"),
  position: z.number().int(),
});

export const evaluationUpdateSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).max(255).optional(),
  position: z.number().int().optional(),
});

export const gradeCellSchema = z.coerce
  .number({ invalid_type_error: "Nilai harus berupa angka" })
  .min(0, "Nilai minimal 0")
  .max(100, "Nilai maksimal 100");

export const gradeEntrySchema = z.object({
  student_id: uuid,
  evaluation_id: uuid,
  score: gradeCellSchema,
});

export const reportCardGenerateSchema = z.object({
  homeroom_id: uuid,
  academic_year_id: uuid,
});

export const reportCardTransitionSchema = z.object({
  note: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

export type EvaluationForm = z.infer<typeof evaluationSchema>;
export type EvaluationUpdateForm = z.infer<typeof evaluationUpdateSchema>;
export type GradeEntryForm = z.infer<typeof gradeEntrySchema>;
export type ReportCardGenerateForm = z.infer<typeof reportCardGenerateSchema>;
export type ReportCardTransitionForm = z.infer<typeof reportCardTransitionSchema>;
