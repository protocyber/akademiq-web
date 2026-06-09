import { z } from "zod";

export const gradingPolicySchema = z.object({
  academic_year_id: z.string().uuid("Pilih tahun ajaran terlebih dahulu"),
  minimum_passing_score: z.coerce.number().min(0, "Minimal 0").max(100, "Maksimal 100"),
  grading_scale: z.enum(["0-100", "A-E"]),
});

export type GradingPolicyForm = z.infer<typeof gradingPolicySchema>;
