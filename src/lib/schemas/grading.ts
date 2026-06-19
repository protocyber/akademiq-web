import { z } from "zod";

const uuid = z.string().uuid();

export const evaluationSchema = z.object({
  homeroom_id: uuid,
  subject_id: uuid,
  academic_year_id: uuid,
  term_id: uuid.optional(),
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
  report_type_id: uuid,
  homeroom_id: uuid,
});

export const reportTypeCreateSchema = z.object({
  academic_year_id: uuid,
  term_id: uuid.optional(),
  code: z.string().min(1, "Kode wajib diisi").max(64, "Kode maksimal 64 karakter"),
  name: z.string().min(1, "Nama wajib diisi").max(255, "Nama maksimal 255 karakter"),
});

export const reportTypeUpdateSchema = z.object({
  code: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(255).optional(),
  position: z.number().int().optional(),
});

export const reportFormulaSchema = z.object({
  weights: z.record(z.string().uuid(), z.number().min(0).max(100)),
});

export const copyReportTypesSchema = z.object({
  academic_year_id: uuid,
  source_term_id: uuid,
  target_term_id: uuid,
  overwrite: z.boolean().default(false),
});

export const reportCardTransitionSchema = z.object({
  note: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

export type EvaluationForm = z.infer<typeof evaluationSchema>;
export type EvaluationUpdateForm = z.infer<typeof evaluationUpdateSchema>;
export type GradeEntryForm = z.infer<typeof gradeEntrySchema>;
export type ReportCardGenerateForm = z.infer<typeof reportCardGenerateSchema>;
export type ReportTypeCreateForm = z.infer<typeof reportTypeCreateSchema>;
export type ReportTypeUpdateForm = z.infer<typeof reportTypeUpdateSchema>;
export type ReportFormulaForm = z.infer<typeof reportFormulaSchema>;
export type CopyReportTypesForm = z.infer<typeof copyReportTypesSchema>;
export type CopyReportTypesResult = { copied: number; skipped: number };
export type ReportCardTransitionForm = z.infer<typeof reportCardTransitionSchema>;
