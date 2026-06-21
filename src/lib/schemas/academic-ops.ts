import { z } from "zod";

const uuid = z.string().uuid();
const identifier = z.string().min(1).regex(/^[A-Za-z0-9_-]+$/, "Gunakan huruf, angka, - atau _");
const optionalString = z.string().min(1).optional().or(z.literal(""));
const optionalDate = z.string().min(1).optional().or(z.literal(""));

// --- Students ---

export const studentSchema = z.object({
  nis: identifier,
  full_name: z.string().min(1, "Nama wajib diisi"),
  gender: z.enum(["male", "female"]),
  birth_date: z.string().min(1, "Tanggal lahir wajib diisi"),
  nisn: optionalString,
  nik: optionalString,
  birth_place: optionalString,
  address_line: optionalString,
  phone_number: optionalString,
  religion: optionalString,
  nationality: optionalString,
  child_order: z.coerce.number().int().positive().optional().or(z.literal(0)),
  sibling_count: z.coerce.number().int().min(0).optional(),
  entry_date: optionalDate,
  origin_school: optionalString,
  initial_placement: z
    .object({ academic_year_id: uuid, homeroom_id: uuid })
    .optional(),
});

// --- Teachers ---

export const teacherSchema = z.object({
  nip: identifier,
  full_name: z.string().min(1, "Nama wajib diisi"),
  nik: optionalString,
  education_level: optionalString,
  gender: z.enum(["male", "female"]).optional().or(z.literal("")),
  birth_date: optionalDate,
  birth_place: optionalString,
  address_line: optionalString,
  phone_number: optionalString,
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  employment_status: optionalString,
  role_position: optionalString,
  start_date: optionalDate,
  end_date: optionalDate,
  primary_subject_area: optionalString,
  nuptk: optionalString,
  certification_number: optionalString,
});

// --- Family Profiles ---

export const familyProfileSchema = z.object({
  full_name: z.string().min(1, "Nama wajib diisi"),
  nik: optionalString,
  birth_place: optionalString,
  birth_date: optionalDate,
  address_line: optionalString,
  phone_number: optionalString,
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  occupation: optionalString,
  income_range: optionalString,
  life_status: z.enum(["hidup", "meninggal"]).optional().or(z.literal("")),
  marital_status: optionalString,
  nationality: optionalString,
  religion: optionalString,
  education_level: optionalString,
  user_id: uuid.optional().or(z.literal("")),
});

// --- Student-Family Links ---

export const familyLinkSchema = z.object({
  family_id: uuid,
  relationship_type: z.enum([
    "ayah",
    "ibu",
    "wali",
    "kakek",
    "nenek",
    "saudara",
    "lainnya",
  ]),
  primary_contact: z.boolean().optional(),
  emergency_contact: z.boolean().optional(),
  lives_with_student: z.boolean().optional(),
  financial_responsible: z.boolean().optional(),
});

export const familyLinkUpdateSchema = z.object({
  relationship_type: z
    .enum(["ayah", "ibu", "wali", "kakek", "nenek", "saudara", "lainnya"])
    .optional(),
  primary_contact: z.boolean().optional(),
  emergency_contact: z.boolean().optional(),
  lives_with_student: z.boolean().optional(),
  financial_responsible: z.boolean().optional(),
  status: z.enum(["aktif", "nonaktif"]).optional(),
});

// --- School Profile (Billing) ---

export const schoolProfileSchema = z.object({
  school_name: z.string().min(1, "Nama sekolah wajib diisi"),
  phone_number: optionalString,
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  website: optionalString,
  npsn: optionalString,
  school_level: z
    .enum(["sd", "smp", "sma", "mi", "mts", "ma", "slb", "lainnya"])
    .optional()
    .or(z.literal("")),
  school_status: z.enum(["negeri", "swasta"]).optional().or(z.literal("")),
  accreditation: z
    .enum(["a", "b", "c", "belum_terakreditasi"])
    .optional()
    .or(z.literal("")),
  address_line: optionalString,
  village: optionalString,
  subdistrict: optionalString,
  city_regency: optionalString,
  province: optionalString,
  postal_code: optionalString,
});

// --- Archive ---

export const archiveReasonSchema = z.object({
  reason: z.string().min(1, "Alasan arsip wajib diisi"),
});

// --- Existing schemas ---

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
export type FamilyProfileForm = z.infer<typeof familyProfileSchema>;
export type FamilyLinkForm = z.infer<typeof familyLinkSchema>;
export type FamilyLinkUpdateForm = z.infer<typeof familyLinkUpdateSchema>;
export type SchoolProfileForm = z.infer<typeof schoolProfileSchema>;
export type ArchiveReasonForm = z.infer<typeof archiveReasonSchema>;
export type HomeroomForm = z.infer<typeof homeroomSchema>;
export type EnrollmentForm = z.infer<typeof enrollmentSchema>;
export type TeachingAssignmentForm = z.infer<typeof teachingAssignmentSchema>;
