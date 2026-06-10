import { z } from "zod";

const uuid = z.string().uuid();

export const gradeEntrySchema = z.object({
  student_id: uuid,
  subject_id: uuid,
  academic_year_id: uuid,
  score: z.coerce.number().min(0, "Nilai minimal 0").max(100, "Nilai maksimal 100"),
});

export type GradeEntryForm = z.infer<typeof gradeEntrySchema>;
