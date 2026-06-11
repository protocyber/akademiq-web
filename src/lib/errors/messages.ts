import { ApiHttpError } from "@/lib/api/types";
import { summariseFieldErrors } from "@/lib/forms/apply-server-field-errors";

type ErrorMessageOptions = {
  fallback?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  ACTIVE_YEAR_EXISTS: "Sudah ada tahun ajaran aktif. Arsipkan atau tutup tahun ajaran aktif sebelum mengaktifkan yang lain.",
  EMAIL_ALREADY_EXISTS: "Email sudah terdaftar. Gunakan email lain atau cek daftar pengguna.",
  EXPIRED_ACCESS_TOKEN: "Sesi Anda sudah berakhir. Silakan masuk kembali.",
  FEATURE_NOT_AVAILABLE: "Fitur ini belum aktif untuk sekolah Anda. Aktifkan modul atau cek paket langganan.",
  GRADES_LOCKED: "Nilai sudah dikunci karena rapor masuk proses review. Kembalikan rapor ke Draft jika nilai perlu diperbaiki.",
  GRADING_POLICY_NOT_CONFIGURED: "Kebijakan nilai belum tersinkron. Buka Pengaturan Akademik > Kebijakan Nilai, simpan ulang kebijakan untuk tahun ajaran ini, lalu coba generate draft rapor lagi.",
  IMPORT_VALIDATION_FAILED: "Import gagal. Periksa error pada baris data yang ditandai.",
  INVALID_STATE_TRANSITION: "Status sudah berubah atau aksi ini tidak valid untuk status saat ini. Muat ulang halaman lalu coba lagi.",
  INVALID_TOKEN: "Sesi Anda tidak valid. Silakan masuk kembali.",
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
  return options.fallback ?? "Terjadi kesalahan. Coba lagi.";
}
