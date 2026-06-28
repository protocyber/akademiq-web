import { z } from "zod";

export const classTemplateSchema = z.object({
  academic_year_id: z.string().uuid("Pilih tahun ajaran terlebih dahulu"),
  grade_level: z.string().min(1),
  default_capacity: z.coerce.number().int().min(1, "Kapasitas minimal 1"),
});

export type ClassTemplateForm = z.infer<typeof classTemplateSchema>;
