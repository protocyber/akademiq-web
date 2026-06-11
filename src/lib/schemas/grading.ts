import { z } from "zod";

const uuid = z.string().uuid();

export const gradeEntrySchema = z.object({
  student_id: uuid,
  subject_id: uuid,
  academic_year_id: uuid,
  score: z.coerce.number().min(0, "Nilai minimal 0").max(100, "Nilai maksimal 100"),
});

export const reportCardGenerateSchema = z.object({
  homeroom_id: uuid,
  academic_year_id: uuid,
});

export const reportCardTransitionSchema = z.object({
  note: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

export type GradeEntryForm = z.infer<typeof gradeEntrySchema>;
export type ReportCardGenerateForm = z.infer<typeof reportCardGenerateSchema>;
export type ReportCardTransitionForm = z.infer<typeof reportCardTransitionSchema>;
