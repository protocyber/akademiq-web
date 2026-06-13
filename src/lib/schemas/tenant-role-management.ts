import { z } from "zod";

const roleCodeSchema = z
  .string()
  .min(2, "Kode role minimal 2 karakter")
  .max(64, "Kode role maksimal 64 karakter")
  .regex(/^[a-z0-9._-]+$/, "Kode role hanya boleh huruf kecil, angka, titik, garis bawah, atau minus");

const permissionListSchema = z.array(z.string().min(1)).default([]);

export const createTenantRoleSchema = z.object({
  code: roleCodeSchema,
  name: z.string().min(1, "Nama role wajib diisi"),
  permissions: permissionListSchema,
});

export const updateTenantRoleSchema = z.object({
  name: z.string().min(1, "Nama role wajib diisi").optional(),
  permissions: permissionListSchema.optional(),
});

export type CreateTenantRoleForm = z.infer<typeof createTenantRoleSchema>;
export type UpdateTenantRoleForm = z.infer<typeof updateTenantRoleSchema>;
