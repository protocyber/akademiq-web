"use client";

import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { hasAccessPerm, hasAccessRole } from "@/lib/auth/access-claims";

/** Mirrors the backend gate of the copy endpoints: tenant_admin + academic.config.write. */
export function canCopyYear(canManage: boolean): boolean {
  return canManage && hasAccessRole("tenant_admin") && hasAccessPerm("academic.config.write");
}

export function CopyAdminOnly() {
  return (
    <Alert>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>Hanya admin sekolah yang dapat menyalin data tahun ajaran.</span>
        <Link href="/settings/academic/years" className="font-medium underline">
          Kembali ke tahun ajaran
        </Link>
      </AlertDescription>
    </Alert>
  );
}
