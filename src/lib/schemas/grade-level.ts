import { z } from "zod";

export const gradeLevelSchema = z.object({
  academic_year_id: z.string().uuid("Pilih tahun ajaran terlebih dahulu"),
  code: z.string().min(1, "Kode tingkat wajib diisi").max(64, "Maksimal 64 karakter"),
  label: z.string().min(1, "Nama tingkat wajib diisi").max(64, "Maksimal 64 karakter"),
  ordinal: z.coerce.number().int().min(1, "Urutan minimal 1"),
  is_final: z.boolean().default(false),
});

export type GradeLevelForm = z.infer<typeof gradeLevelSchema>;
