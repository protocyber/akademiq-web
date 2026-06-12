import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi").email("Email harus valid"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter"),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(64, "Username maksimal 64 karakter")
    .regex(
      /^[a-z][a-z0-9_-]{2,63}$/,
      "Username harus diawali huruf kecil dan hanya boleh mengandung huruf kecil, angka, '-', atau '_'"
    )
    .optional()
    .or(z.literal("")),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
