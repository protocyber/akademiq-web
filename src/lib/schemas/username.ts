import { z } from "zod";

/**
 * Shared username rule mirroring the IAM DB contract
 * (`^[a-z][a-z0-9_-]{2,63}$`, no `@`, globally unique case-insensitively —
 * uniqueness is enforced server-side). Kept in one place so signup, create,
 * and edit flows stay aligned.
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username minimal 3 karakter")
  .max(64, "Username maksimal 64 karakter")
  .regex(
    /^[a-z][a-z0-9_-]{2,63}$/,
    "Username harus diawali huruf kecil dan hanya boleh mengandung huruf kecil, angka, '-', atau '_'",
  );
