"use client";

import { hasAccessPerm, hasAccessRole } from "@/lib/auth/access-claims";

/** Mirrors the backend gate of the copy endpoints: tenant_admin + academic.config.write. */
export function canCopyYear(canManage: boolean): boolean {
  return canManage && hasAccessRole("tenant_admin") && hasAccessPerm("academic.config.write");
}
