import { z } from "zod";

import { usernameSchema } from "@/lib/schemas/username";

export const signupSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi").email("Email harus valid"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter"),
  username: usernameSchema.optional().or(z.literal("")),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
