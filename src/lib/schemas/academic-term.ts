import { z } from "zod";

export const academicTermSchema = z.object({
  name: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
});

export const termTransitionRequestSchema = z.object({
  status: z.enum(["Draft", "Active", "Closed", "Archived"]),
  reason: z.string().min(10, "Alasan minimal harus 10 karakter").optional(),
});

export type AcademicTermStatus = z.infer<typeof termTransitionRequestSchema>["status"];

export type AcademicTermForm = z.infer<typeof academicTermSchema>;
export type TermTransitionRequestForm = z.infer<typeof termTransitionRequestSchema>;
