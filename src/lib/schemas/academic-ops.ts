import { z } from "zod";

const uuid = z.string().uuid();
const identifier = z.string().min(1).regex(/^[A-Za-z0-9_-]+$/, "Gunakan huruf, angka, - atau _");

export const studentSchema = z.object({
  nis: identifier,
  full_name: z.string().min(1, "Nama wajib diisi"),
  gender: z.enum(["male", "female", "other"]),
  birth_date: z.string().min(1, "Tanggal lahir wajib diisi"),
});

export const teacherSchema = z.object({
  nip: identifier,
  full_name: z.string().min(1, "Nama wajib diisi"),
});

export const homeroomSchema = z.object({
  name: z.string().min(1, "Nama kelas wajib diisi"),
  grade_level: z.string().min(1, "Tingkat wajib diisi"),
  capacity: z.coerce.number().int().positive(),
  academic_year_id: uuid,
});

export const enrollmentSchema = z.object({
  student_id: uuid,
  homeroom_id: uuid,
  transfer: z.boolean().optional(),
});

export const teachingAssignmentSchema = z.object({
  teacher_id: uuid,
  subject_id: uuid,
  homeroom_id: uuid,
  academic_year_id: uuid,
});

export type StudentForm = z.infer<typeof studentSchema>;
export type TeacherForm = z.infer<typeof teacherSchema>;
export type HomeroomForm = z.infer<typeof homeroomSchema>;
export type EnrollmentForm = z.infer<typeof enrollmentSchema>;
export type TeachingAssignmentForm = z.infer<typeof teachingAssignmentSchema>;
