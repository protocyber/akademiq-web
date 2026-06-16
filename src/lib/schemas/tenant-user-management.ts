import { z } from "zod";

import { usernameSchema } from "@/lib/schemas/username";

export const tenantAssignableRoles = [
  "teacher",
  "homeroom_teacher",
  "principal",
  "parent",
  "student",
] as const;

export const inviteTenantUserSchema = z.object({
  email: z.string().email("Email tidak valid"),
  roles: z.array(z.string().min(1)).min(1, "Pilih minimal satu role"),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token undangan wajib diisi"),
});

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Password minimal 8 karakter"),
    confirm: z.string().min(8, "Password minimal 8 karakter"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirm"],
  });

export const roleChangeSchema = z.object({
  role: z.enum(tenantAssignableRoles),
});

export const createTenantUserSchema = z.object({
  username: usernameSchema,
  full_name: z.string().trim().min(1, "Nama lengkap wajib diisi"),
  roles: z.array(z.string().min(1)).min(1, "Pilih minimal satu role"),
  email: z
    .string()
    .trim()
    .email("Email tidak valid")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .optional()
    .or(z.literal("")),
});

export const updateTenantUserSchema = z.object({
  username: usernameSchema,
  full_name: z.string().trim().min(1, "Nama lengkap wajib diisi"),
  email: z
    .string()
    .trim()
    .email("Email tidak valid")
    .optional()
    .or(z.literal("")),
});

export type InviteTenantUserForm = z.infer<typeof inviteTenantUserSchema>;
export type AcceptInvitationForm = z.infer<typeof acceptInvitationSchema>;
export type SetPasswordForm = z.infer<typeof setPasswordSchema>;
export type RoleChangeForm = z.infer<typeof roleChangeSchema>;
export type CreateTenantUserForm = z.infer<typeof createTenantUserSchema>;
export type UpdateTenantUserForm = z.infer<typeof updateTenantUserSchema>;
