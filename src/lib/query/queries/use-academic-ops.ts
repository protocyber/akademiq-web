"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch, apiFetchEnvelope } from "@/lib/api/client";
import {
  DEFAULT_HOMEROOMS_PARAMS,
  homeroomsParamsKey,
  serializeHomeroomsParams,
  type HomeroomsParams,
} from "@/lib/schemas/homerooms-params";
import {
  DEFAULT_STUDENTS_PARAMS,
  serializeStudentsParams,
  studentsParamsKey,
  type StudentsParams,
} from "@/lib/schemas/students-params";
import {
  DEFAULT_TEACHERS_PARAMS,
  serializeTeachersParams,
  teachersParamsKey,
  type TeachersParams,
} from "@/lib/schemas/teachers-params";
import {
  DEFAULT_TEACHING_ASSIGNMENTS_PARAMS,
  serializeTeachingAssignmentsParams,
  teachingAssignmentsParamsKey,
  type TeachingAssignmentsParams,
} from "@/lib/schemas/teaching-assignments-params";

export type Student = {
  student_id: string;
  user_id?: string | null;
  nis: string;
  nisn?: string | null;
  nik?: string | null;
  full_name: string;
  gender: string;
  birth_date: string;
  birth_place?: string | null;
  address_line?: string | null;
  phone_number?: string | null;
  photo_media_id?: string | null;
  religion?: string | null;
  nationality?: string | null;
  child_order?: number | null;
  sibling_count?: number | null;
  entry_date?: string | null;
  origin_school?: string | null;
  status: string;
  archive_reason?: string | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type Teacher = {
  teacher_id: string;
  user_id?: string | null;
  nip: string;
  nik?: string | null;
  full_name: string;
  education_level?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  address_line?: string | null;
  phone_number?: string | null;
  photo_media_id?: string | null;
  email?: string | null;
  employment_status?: string | null;
  role_position?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  primary_subject_area?: string | null;
  nuptk?: string | null;
  certification_number?: string | null;
  status: string;
  archive_reason?: string | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type FamilyProfile = {
  family_id: string;
  user_id?: string | null;
  full_name: string;
  nik?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  address_line?: string | null;
  phone_number?: string | null;
  photo_media_id?: string | null;
  email?: string | null;
  occupation?: string | null;
  income_range?: string | null;
  life_status?: string | null;
  marital_status?: string | null;
  nationality?: string | null;
  religion?: string | null;
  education_level?: string | null;
  status: string;
  archive_reason?: string | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type StudentFamilyLink = {
  link_id: string;
  student_id: string;
  family_id: string;
  relationship_type: string;
  primary_contact: boolean;
  emergency_contact: boolean;
  lives_with_student: boolean;
  financial_responsible: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  family?: FamilyProfile;
};

export type MediaAsset = {
  media_id: string;
  owner_type: string;
  owner_id: string;
  file_url: string;
  content_type: string;
  size_bytes: number;
  is_active: boolean;
  uploaded_at: string;
};

export type Guardian = { tenant_id: string; user_id: string; student_id: string; created_at: string };
export type Homeroom = { homeroom_id: string; name: string; grade_level: string; capacity: number; academic_year_id: string; enrolled_count: number };
export type TeachingAssignment = { assignment_id: string; teacher_id: string; subject_id: string; homeroom_id: string; academic_year_id: string; created_at: string };

export type Paginated<T> = {
  data: T[];
  meta: { page: number; page_size: number; total: number };
};

// Shared query-key prefixes. Mutations invalidate these prefixes so every
// variant (dropdown list + paginated table) refreshes together.
export const STUDENTS_QUERY_KEY = ["academic-ops", "students"] as const;
export const TEACHERS_QUERY_KEY = ["academic-ops", "teachers"] as const;
export const FAMILIES_QUERY_KEY = ["academic-ops", "families"] as const;
export const HOMEROOMS_QUERY_KEY = ["academic-ops", "homerooms"] as const;
export const TEACHING_ASSIGNMENTS_QUERY_KEY = ["academic-ops", "teaching-assignments"] as const;
export const MEDIA_QUERY_KEY = ["academic-ops", "media"] as const;

// --- dropdown / consumer hooks (array; preserved for grading + roster) ------
// These hit the now-paginated endpoints with a generous page so dropdown
// consumers (grading pickers, roster enroll) still receive the full list.
const DROPDOWN_PAGE_SIZE = "?page=1&page_size=100";

export function useStudents() {
  return useQuery({
    queryKey: [...STUDENTS_QUERY_KEY, "all"],
    queryFn: () => apiFetch<Student[]>({ service: "academic-ops", path: `/api/v1/academic-ops/students${DROPDOWN_PAGE_SIZE}`, authenticated: true }),
  });
}

export function useTeachers() {
  return useQuery({
    queryKey: [...TEACHERS_QUERY_KEY, "all"],
    queryFn: () => apiFetch<Teacher[]>({ service: "academic-ops", path: `/api/v1/academic-ops/teachers${DROPDOWN_PAGE_SIZE}`, authenticated: true }),
  });
}

export function useHomerooms() {
  return useQuery({
    queryKey: [...HOMEROOMS_QUERY_KEY, "all"],
    queryFn: () => apiFetch<Homeroom[]>({ service: "academic-ops", path: `/api/v1/academic-ops/homerooms${DROPDOWN_PAGE_SIZE}`, authenticated: true }),
  });
}

export function useHomeroomRoster(homeroomId?: string) {
  return useQuery({
    queryKey: ["academic-ops", "homeroom-roster", homeroomId],
    queryFn: () => apiFetch<Student[]>({ service: "academic-ops", path: `/api/v1/academic-ops/homerooms/${homeroomId}/students`, authenticated: true }),
    enabled: Boolean(homeroomId),
  });
}

export type Enrollment = {
  enrollment_id: string;
  student_id: string;
  homeroom_id: string;
  academic_year_id: string;
  status: string;
  student_full_name: string;
};

export type StudentEnrollmentSummary = {
  student_id: string;
  homeroom_id: string;
  homeroom_name: string;
};

/** Active enrollments for all students in a given academic year, keyed by student_id. */
export function useStudentEnrollmentsByYear(academicYearId?: string) {
  return useQuery({
    queryKey: ["academic-ops", "enrollments-by-student", academicYearId],
    queryFn: () =>
      apiFetch<StudentEnrollmentSummary[]>({
        service: "academic-ops",
        path: `/api/v1/academic-ops/enrollments/by-student?academic_year_id=${academicYearId}`,
        authenticated: true,
      }),
    enabled: Boolean(academicYearId),
  });
}

/** Active enrollments for a homeroom (with ids and student names) — drives the roster unenroll. */
export function useHomeroomEnrollments(homeroomId?: string) {
  return useQuery({
    queryKey: ["academic-ops", "homeroom-enrollments", homeroomId],
    queryFn: () => apiFetch<Enrollment[]>({ service: "academic-ops", path: `/api/v1/academic-ops/homerooms/${homeroomId}/enrollments`, authenticated: true }),
    enabled: Boolean(homeroomId),
  });
}

export const AVAILABLE_ROSTER_KEY = ["academic-ops", "available-for-roster"] as const;

export function useAvailableRosterStudents({ academicYearId, search, enabled }: { academicYearId?: string; search: string; enabled?: boolean }) {
  const params = new URLSearchParams();
  if (academicYearId) params.set("academic_year_id", academicYearId);
  if (search) params.set("search", search);
  const qs = params.toString();
  return useQuery({
    queryKey: [...AVAILABLE_ROSTER_KEY, academicYearId, search],
    queryFn: () => apiFetch<RosterStudent[]>({ service: "academic-ops", path: `/api/v1/academic-ops/students/available-for-roster${qs ? `?${qs}` : ""}`, authenticated: true }),
    enabled: Boolean(academicYearId) && (enabled ?? true),
    staleTime: 30_000,
  });
}

export type RosterStudent = {
  student_id: string;
  nis: string;
  full_name: string;
};

/** Homeroom-scoped assignment list (grading entry / report cards). */
export function useTeachingAssignments(homeroomId?: string) {
  return useQuery({
    queryKey: [...TEACHING_ASSIGNMENTS_QUERY_KEY, "homeroom", homeroomId],
    queryFn: () => apiFetch<TeachingAssignment[]>({ service: "academic-ops", path: `/api/v1/academic-ops/homerooms/${homeroomId}/teaching-assignments`, authenticated: true }),
    enabled: Boolean(homeroomId),
  });
}

// --- paginated table hooks (server-driven search/sort/pagination) ----------

export function useStudentsTable(params: StudentsParams = DEFAULT_STUDENTS_PARAMS) {
  const query = serializeStudentsParams(params);
  return useQuery({
    queryKey: [...STUDENTS_QUERY_KEY, ...studentsParamsKey(params)],
    queryFn: async (): Promise<Paginated<Student>> => {
      const envelope = await apiFetchEnvelope<Student[]>({ service: "academic-ops", path: `/api/v1/academic-ops/students${query ? `?${query}` : ""}`, authenticated: true });
      return { data: envelope.data, meta: envelope.meta as Paginated<Student>["meta"] };
    },
  });
}

export function useTeachersTable(params: TeachersParams = DEFAULT_TEACHERS_PARAMS) {
  const query = serializeTeachersParams(params);
  return useQuery({
    queryKey: [...TEACHERS_QUERY_KEY, ...teachersParamsKey(params)],
    queryFn: async (): Promise<Paginated<Teacher>> => {
      const envelope = await apiFetchEnvelope<Teacher[]>({ service: "academic-ops", path: `/api/v1/academic-ops/teachers${query ? `?${query}` : ""}`, authenticated: true });
      return { data: envelope.data, meta: envelope.meta as Paginated<Teacher>["meta"] };
    },
  });
}

export function useHomeroomsTable(params: HomeroomsParams = DEFAULT_HOMEROOMS_PARAMS) {
  const query = serializeHomeroomsParams(params);
  return useQuery({
    queryKey: [...HOMEROOMS_QUERY_KEY, ...homeroomsParamsKey(params)],
    queryFn: async (): Promise<Paginated<Homeroom>> => {
      const envelope = await apiFetchEnvelope<Homeroom[]>({ service: "academic-ops", path: `/api/v1/academic-ops/homerooms${query ? `?${query}` : ""}`, authenticated: true });
      return { data: envelope.data, meta: envelope.meta as Paginated<Homeroom>["meta"] };
    },
  });
}

export function useTeachingAssignmentsTable(params: TeachingAssignmentsParams = DEFAULT_TEACHING_ASSIGNMENTS_PARAMS) {
  const query = serializeTeachingAssignmentsParams(params);
  return useQuery({
    queryKey: [...TEACHING_ASSIGNMENTS_QUERY_KEY, ...teachingAssignmentsParamsKey(params)],
    queryFn: async (): Promise<Paginated<TeachingAssignment>> => {
      const envelope = await apiFetchEnvelope<TeachingAssignment[]>({ service: "academic-ops", path: `/api/v1/academic-ops/teaching-assignments${query ? `?${query}` : ""}`, authenticated: true });
      return { data: envelope.data, meta: envelope.meta as Paginated<TeachingAssignment>["meta"] };
    },
  });
}

export function useStudentGuardians(studentId: string) {
  return useQuery({
    queryKey: [...STUDENTS_QUERY_KEY, studentId, "guardians"],
    queryFn: () => apiFetch<Guardian[]>({ service: "academic-ops", path: `/api/v1/academic-ops/students/${studentId}/guardians`, authenticated: true }),
    enabled: Boolean(studentId),
  });
}

// --- student detail ---

export function useStudent(studentId?: string) {
  return useQuery({
    queryKey: [...STUDENTS_QUERY_KEY, studentId],
    queryFn: () => apiFetch<Student>({ service: "academic-ops", path: `/api/v1/academic-ops/students/${studentId}`, authenticated: true }),
    enabled: Boolean(studentId),
  });
}

// --- teacher detail ---

export function useTeacher(teacherId?: string) {
  return useQuery({
    queryKey: [...TEACHERS_QUERY_KEY, teacherId],
    queryFn: () => apiFetch<Teacher>({ service: "academic-ops", path: `/api/v1/academic-ops/teachers/${teacherId}`, authenticated: true }),
    enabled: Boolean(teacherId),
  });
}

// --- family profiles ---

export type FamiliesParams = {
  search?: string;
  page: number;
  page_size: number;
  sort: FamiliesSort;
};

export type FamiliesSort = "name" | "-name" | "status" | "-status";

export const DEFAULT_FAMILIES_PARAMS: FamiliesParams = {
  page: 1,
  page_size: 25,
  sort: "name",
};

export function useFamilies() {
  return useQuery({
    queryKey: [...FAMILIES_QUERY_KEY, "all"],
    queryFn: () => apiFetch<FamilyProfile[]>({ service: "academic-ops", path: `/api/v1/academic-ops/family-profiles${DROPDOWN_PAGE_SIZE}`, authenticated: true }),
  });
}

export function useFamiliesTable(params: FamiliesParams = DEFAULT_FAMILIES_PARAMS) {
  const query = serializeFamiliesParams(params);
  return useQuery({
    queryKey: [...FAMILIES_QUERY_KEY, ...familiesParamsKey(params)],
    queryFn: async (): Promise<Paginated<FamilyProfile>> => {
      const envelope = await apiFetchEnvelope<FamilyProfile[]>({ service: "academic-ops", path: `/api/v1/academic-ops/family-profiles${query ? `?${query}` : ""}`, authenticated: true });
      return { data: envelope.data, meta: envelope.meta as Paginated<FamilyProfile>["meta"] };
    },
  });
}

export function useFamilyProfile(familyId?: string) {
  return useQuery({
    queryKey: [...FAMILIES_QUERY_KEY, familyId],
    queryFn: () => apiFetch<FamilyProfile>({ service: "academic-ops", path: `/api/v1/academic-ops/family-profiles/${familyId}`, authenticated: true }),
    enabled: Boolean(familyId),
  });
}

// --- student-family links ---

export function useStudentFamilyLinks(studentId?: string) {
  return useQuery({
    queryKey: [...STUDENTS_QUERY_KEY, studentId, "family-links"],
    queryFn: () => apiFetch<StudentFamilyLink[]>({ service: "academic-ops", path: `/api/v1/academic-ops/students/${studentId}/family-links`, authenticated: true }),
    enabled: Boolean(studentId),
  });
}

// --- media assets ---

export function useMediaAssets(ownerType?: string, ownerId?: string) {
  return useQuery({
    queryKey: [...MEDIA_QUERY_KEY, ownerType, ownerId],
    queryFn: () => apiFetch<MediaAsset[]>({ service: "academic-ops", path: `/api/v1/academic-ops/media?owner_type=${ownerType}&owner_id=${ownerId}`, authenticated: true }),
    enabled: Boolean(ownerType && ownerId),
  });
}

// --- families params helpers ---

function serializeFamiliesParams(params: FamiliesParams) {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.page !== DEFAULT_FAMILIES_PARAMS.page) sp.set("page", String(params.page));
  if (params.page_size !== DEFAULT_FAMILIES_PARAMS.page_size) sp.set("page_size", String(params.page_size));
  if (params.sort !== DEFAULT_FAMILIES_PARAMS.sort) sp.set("sort", params.sort);
  return sp.toString();
}

function familiesParamsKey(params: FamiliesParams) {
  return [params.search ?? "", params.page, params.page_size, params.sort] as const;
}
