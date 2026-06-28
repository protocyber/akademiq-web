import { z } from "zod";

export const registerSchema = z.object({
  school_name: z
    .string()
    .min(1)
    .max(200, "Nama sekolah terlalu panjang"),
  plan_id: z.string().uuid("Pilih paket"),
  admin_email: z
    .string()
    .min(1)
    .email("Format email tidak valid"),
  admin_password: z.string().min(8, "Password minimal 8 karakter"),
  admin_full_name: z
    .string()
    .min(1)
    .max(200, "Nama lengkap terlalu panjang"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const registerExistingUserSchema = z.object({
  school_name: z
    .string()
    .min(1)
    .max(200, "Nama sekolah terlalu panjang"),
  plan_id: z.string().uuid("Pilih paket"),
});

export type RegisterExistingUserFormValues = z.infer<typeof registerExistingUserSchema>;
