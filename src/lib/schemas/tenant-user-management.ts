import { z } from "zod";

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
  password: z.string().min(8, "Password minimal 8 karakter"),
  full_name: z.string().min(1, "Nama lengkap wajib diisi"),
});

export const roleChangeSchema = z.object({
  role: z.enum(tenantAssignableRoles),
});

export type InviteTenantUserForm = z.infer<typeof inviteTenantUserSchema>;
export type AcceptInvitationForm = z.infer<typeof acceptInvitationSchema>;
export type RoleChangeForm = z.infer<typeof roleChangeSchema>;
