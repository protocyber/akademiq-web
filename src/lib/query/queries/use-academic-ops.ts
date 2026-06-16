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

export type Student = { student_id: string; user_id?: string | null; nis: string; full_name: string; gender: string; birth_date: string };
export type Teacher = { teacher_id: string; user_id?: string | null; nip: string; full_name: string };
export type Guardian = { tenant_id: string; user_id: string; student_id: string; created_at: string };
export type Homeroom = { homeroom_id: string; name: string; grade_level: string; capacity: number; academic_year_id: string };
export type TeachingAssignment = { assignment_id: string; teacher_id: string; subject_id: string; homeroom_id: string; academic_year_id: string };

export type Paginated<T> = {
  data: T[];
  meta: { page: number; page_size: number; total: number };
};

// Shared query-key prefixes. Mutations invalidate these prefixes so every
// variant (dropdown list + paginated table) refreshes together.
export const STUDENTS_QUERY_KEY = ["academic-ops", "students"] as const;
export const TEACHERS_QUERY_KEY = ["academic-ops", "teachers"] as const;
export const HOMEROOMS_QUERY_KEY = ["academic-ops", "homerooms"] as const;
export const TEACHING_ASSIGNMENTS_QUERY_KEY = ["academic-ops", "teaching-assignments"] as const;

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
};

/** Active enrollments for a homeroom (with ids) — drives the roster unenroll. */
export function useHomeroomEnrollments(homeroomId?: string) {
  return useQuery({
    queryKey: ["academic-ops", "homeroom-enrollments", homeroomId],
    queryFn: () => apiFetch<Enrollment[]>({ service: "academic-ops", path: `/api/v1/academic-ops/homerooms/${homeroomId}/enrollments`, authenticated: true }),
    enabled: Boolean(homeroomId),
  });
}

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
