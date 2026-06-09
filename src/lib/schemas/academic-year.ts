import { z } from "zod";

export const academicYearSchema = z.object({
  name: z.string().min(1, "Nama tahun ajaran wajib diisi"),
  start_date: z.string().min(1, "Tanggal mulai wajib diisi"),
  end_date: z.string().min(1, "Tanggal selesai wajib diisi"),
});

export const yearStatusSchema = z.object({
  status: z.enum([
    "Planning",
    "Configuration",
    "Active",
    "Locked",
    "Finalizing",
    "Closed",
    "Archived",
  ]),
});

export type AcademicYearForm = z.infer<typeof academicYearSchema>;
export type YearStatusForm = z.infer<typeof yearStatusSchema>;
