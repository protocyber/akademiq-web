import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email atau username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
  remember_device: z.boolean().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
