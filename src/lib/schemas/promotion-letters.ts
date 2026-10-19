import { z } from "zod";

const number64 = (required: string) =>
  z.string().trim().min(1, required).max(64, "Maksimal 64 karakter");

/** SK Kenaikan Kelas dialog; keys match the backend so field errors map. */
export const classLetterSchema = z.object({
  letter_number: number64("Nomor SK wajib diisi"),
  letter_date: z.string().min(1, "Tanggal surat wajib diisi"),
  city: z.string().trim().max(200, "Maksimal 200 karakter"),
});
export type ClassLetterForm = z.infer<typeof classLetterSchema>;

function isPositiveInt(value: string) {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= 1;
}

function isDigits(value: string) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 6;
}

/** "Isi nomor dari pola" dialog (spec §4.1). */
export const numberPatternSchema = z.object({
  pattern: z
    .string()
    .trim()
    .min(1, "Pola wajib diisi")
    .refine((p) => p.includes("{n}"), "Pola harus memuat {n}"),
  start: z.string().refine(isPositiveInt, "Isi bilangan bulat 1 atau lebih"),
  digits: z.string().refine(isDigits, "Isi 1 sampai 6"),
  letter_date: z.string().min(1, "Tanggal surat wajib diisi"),
  city: z.string().trim().max(200, "Maksimal 200 karakter"),
  overwrite: z.boolean(),
});
export type NumberPatternForm = z.infer<typeof numberPatternSchema>;

/** Blank city → null: the server then uses the school profile's city. */
export function toCityPayload(city: string): string | null {
  const trimmed = city.trim();
  return trimmed === "" ? null : trimmed;
}
