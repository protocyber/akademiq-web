import { ApiHttpError } from "@/lib/api/types";
import { summariseFieldErrors } from "@/lib/forms/apply-server-field-errors";

type ErrorMessageOptions = {
  fallback?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  ACTIVE_YEAR_EXISTS: "Sudah ada tahun ajaran aktif. Arsipkan atau tutup tahun ajaran aktif sebelum mengaktifkan yang lain.",
  BUILT_IN_ROLE_IMMUTABLE: "Role bawaan tidak bisa diubah atau dihapus. Clone ke role custom untuk memodifikasi.",
  EMAIL_ALREADY_EXISTS: "Email sudah terdaftar. Gunakan email lain atau cek daftar pengguna.",
  EXPIRED_ACCESS_TOKEN: "Sesi Anda sudah berakhir. Silakan masuk kembali.",
  FEATURE_NOT_AVAILABLE: "Fitur ini belum aktif untuk sekolah Anda. Aktifkan modul atau cek paket langganan.",
  GRADES_LOCKED: "Nilai sudah dikunci karena rapor masuk proses review. Kembalikan rapor ke Draft jika nilai perlu diperbaiki.",
  GRADING_POLICY_NOT_CONFIGURED: "Kebijakan nilai belum tersinkron. Buka Pengaturan Akademik > Kebijakan Nilai, simpan ulang kebijakan untuk tahun ajaran ini, lalu coba generate draft rapor lagi.",
  IMPORT_VALIDATION_FAILED: "Import gagal. Periksa error pada baris data yang ditandai.",
  INVALID_STATE_TRANSITION: "Status sudah berubah atau aksi ini tidak valid untuk status saat ini. Muat ulang halaman lalu coba lagi.",
  INVALID_TOKEN: "Sesi Anda tidak valid. Silakan masuk kembali.",
  LAST_ADMIN: "Tidak bisa menghapus otoritas admin terakhir di tenant ini.",
  LAST_ROLE: "Tidak bisa menghapus role terakhir pengguna. Gunakan aksi \"Keluarkan dari tenant\" untuk mengeluarkan pengguna.",
  PRIVILEGE_ESCALATION: "Anda hanya bisa memberi izin yang juga Anda miliki.",
  ROLE_CODE_EXISTS: "Kode role sudah digunakan.",
  ROLE_IN_USE: "Role masih dipakai pengguna dan tidak bisa dihapus.",
  STUDENT_ENROLLED: "Siswa masih memiliki enrollment aktif dan tidak bisa dihapus.",
  TEACHER_ASSIGNED: "Guru masih ditugaskan mengajar dan tidak bisa dihapus.",
  HOMEROOM_NOT_EMPTY: "Kelas masih memiliki siswa aktif dan tidak bisa dihapus.",
  USERNAME_TAKEN: "Username sudah digunakan. Pilih username lain.",
  exchange_failed: "Login dengan Gmail gagal saat menghubungi Google. Coba lagi.",
  google_denied: "Login dengan Gmail dibatalkan.",
  invalid_state: "Sesi Login dengan Gmail sudah kedaluwarsa. Coba lagi.",
  missing_code: "Respons Login dengan Gmail tidak lengkap. Coba lagi.",
  missing_identity_token: "Login dengan Gmail tidak menghasilkan token sesi. Coba lagi.",
  verification_failed: "Akun Google tidak bisa diverifikasi. Coba lagi.",
  NOT_ASSIGNED: "Akun guru belum ditugaskan untuk kelas, mata pelajaran, dan tahun ajaran ini.",
  STUDENT_NOT_ENROLLED: "Siswa belum terdaftar aktif pada tahun ajaran ini.",
  TEACHER_ACCOUNT_NOT_LINKED: "Data guru belum terhubung ke akun pengguna. Hubungi admin untuk menghubungkan akun guru.",
  UNAUTHENTICATED: "Sesi Anda sudah berakhir. Silakan masuk kembali.",
  VALIDATION_ERROR: "Data belum valid. Periksa kembali isian formulir.",
  WRONG_APPROVER_ROLE: "Akun Anda belum memiliki peran yang sesuai untuk aksi ini. Hubungi admin untuk mengecek role dan penugasan kelas.",
};

export function isApiError(error: unknown, code: string): boolean {
  return error instanceof ApiHttpError && error.code === code;
}

/**
 * Field-level copy for the create-user form when a `USERNAME_TAKEN` /
 * `EMAIL_ALREADY_EXISTS` conflict means the person already has an account —
 * steer the admin to the invitation flow instead of implying a typo.
 */
export const CREATE_USER_ALREADY_EXISTS_MESSAGE =
  "Orang ini sudah punya akun. Gunakan alur undangan untuk menambahkannya ke tenant ini.";

/** Confirmation prompt for the explicit remove-from-tenant action. */
export function removeFromTenantConfirm(name: string): string {
  return `Keluarkan ${name} dari tenant ini? Semua role mereka di tenant akan dihapus. Akun global tidak dihapus.`;
}

/** Confirmation prompt for the admin-triggered password reset. */
export function resetPasswordConfirm(name: string): string {
  return `Reset password untuk ${name}? Password baru akan dibuat dan ditampilkan sekali.`;
}

/** Confirmation prompt for bulk role deletion. */
export function bulkDeleteRolesConfirm(count: number): string {
  return `Hapus ${count} role custom yang dipilih? Pengguna yang memegang role ini akan kehilangan akses terkait.`;
}

/** Helper text shown when bulk delete is blocked by a built-in role in the selection. */
export const BULK_DELETE_BUILTIN_BLOCKED =
  "Lepaskan role bawaan dari pilihan untuk menghapus.";

export function getErrorMessage(error: unknown, options: ErrorMessageOptions = {}): string {
  if (error instanceof ApiHttpError) {
    if (error.fields) {
      const summary = summariseFieldErrors(error.fields);
      if (summary) return summary;
    }
    return ERROR_MESSAGES[error.code] ?? error.message ?? options.fallback ?? "Terjadi kesalahan. Coba lagi.";
  }
  if (error instanceof Error && error.message) {
    return options.fallback ?? error.message;
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    return ERROR_MESSAGES[code] ?? options.fallback ?? "Terjadi kesalahan. Coba lagi.";
  }
  return options.fallback ?? "Terjadi kesalahan. Coba lagi.";
}
