import { z } from "zod";

export const academicYearSchema = z.object({
  name: z.string().min(1, "Nama tahun ajaran wajib diisi"),
  start_date: z.string().min(1, "Tanggal mulai wajib diisi"),
  end_date: z.string().min(1, "Tanggal selesai wajib diisi"),
});

export const yearStatusSchema = z.object({
  status: z.enum(["Draft", "Active", "Closed", "Archived"]),
});

export const transitionRequestSchema = z.object({
  status: z.enum(["Draft", "Active", "Closed", "Archived"]),
  reason: z.string().min(10, "Alasan minimal harus 10 karakter"),
});

export type AcademicYearForm = z.infer<typeof academicYearSchema>;
export type YearStatusForm = z.infer<typeof yearStatusSchema>;
export type TransitionRequestForm = z.infer<typeof transitionRequestSchema>;
