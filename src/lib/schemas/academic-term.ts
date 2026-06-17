import { z } from "zod";

export const academicTermSchema = z.object({
  name: z.string().min(1, "Nama semester wajib diisi"),
  start_date: z.string().min(1, "Tanggal mulai wajib diisi"),
  end_date: z.string().min(1, "Tanggal selesai wajib diisi"),
});

export const termTransitionRequestSchema = z.object({
  status: z.enum(["Draft", "Active", "Closed", "Archived"]),
  reason: z.string().min(10, "Alasan minimal harus 10 karakter"),
});

export type AcademicTermForm = z.infer<typeof academicTermSchema>;
export type TermTransitionRequestForm = z.infer<typeof termTransitionRequestSchema>;
