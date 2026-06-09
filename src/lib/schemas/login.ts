import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Email must be valid"),
  password: z.string().min(1, "Password is required"),
  remember_device: z.boolean().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
