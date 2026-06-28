import { z } from "zod";

export const academicYearSchema = z.object({
  name: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
});

export const yearStatusSchema = z.object({
  status: z.enum(["Draft", "Active", "Closed", "Archived"]),
});

export const transitionRequestSchema = z.object({
  status: z.enum(["Draft", "Active", "Closed", "Archived"]),
  reason: z.string().min(10, "Alasan minimal harus 10 karakter").optional(),
});

export type AcademicYearStatus = z.infer<typeof transitionRequestSchema>["status"];

export type AcademicYearForm = z.infer<typeof academicYearSchema>;
export type UpdateAcademicYearForm = z.infer<typeof academicYearSchema>;
export type YearStatusForm = z.infer<typeof yearStatusSchema>;
export type TransitionRequestForm = z.infer<typeof transitionRequestSchema>;
