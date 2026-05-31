import { z } from "zod";

export const registerSchema = z.object({
  school_name: z
    .string()
    .min(1, "School name is required")
    .max(200, "School name is too long"),
  plan_id: z.string().uuid("Choose a plan"),
  admin_email: z
    .string()
    .min(1, "Email is required")
    .email("Email must be valid"),
  admin_password: z.string().min(8, "Password must be at least 8 characters"),
  admin_full_name: z
    .string()
    .min(1, "Full name is required")
    .max(200, "Full name is too long"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
