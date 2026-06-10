"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";

export type Student = { student_id: string; nis: string; full_name: string; gender: string; birth_date: string };
export type Teacher = { teacher_id: string; user_id?: string | null; nip: string; full_name: string };
export type Homeroom = { homeroom_id: string; name: string; grade_level: string; capacity: number; academic_year_id: string };
export type TeachingAssignment = { assignment_id: string; teacher_id: string; subject_id: string; homeroom_id: string; academic_year_id: string };

export const STUDENTS_QUERY_KEY = ["academic-ops", "students"] as const;
export const TEACHERS_QUERY_KEY = ["academic-ops", "teachers"] as const;
export const HOMEROOMS_QUERY_KEY = ["academic-ops", "homerooms"] as const;

export function useStudents() {
  return useQuery({ queryKey: STUDENTS_QUERY_KEY, queryFn: () => apiFetch<Student[]>({ service: "academic-ops", path: "/api/v1/academic-ops/students", authenticated: true }) });
}

export function useTeachers() {
  return useQuery({ queryKey: TEACHERS_QUERY_KEY, queryFn: () => apiFetch<Teacher[]>({ service: "academic-ops", path: "/api/v1/academic-ops/teachers", authenticated: true }) });
}

export function useHomerooms() {
  return useQuery({ queryKey: HOMEROOMS_QUERY_KEY, queryFn: () => apiFetch<Homeroom[]>({ service: "academic-ops", path: "/api/v1/academic-ops/homerooms", authenticated: true }) });
}

export function useHomeroomRoster(homeroomId?: string) {
  return useQuery({
    queryKey: ["academic-ops", "homeroom-roster", homeroomId],
    queryFn: () => apiFetch<Student[]>({ service: "academic-ops", path: `/api/v1/academic-ops/homerooms/${homeroomId}/students`, authenticated: true }),
    enabled: Boolean(homeroomId),
  });
}

export function useTeachingAssignments(homeroomId?: string) {
  return useQuery({
    queryKey: ["academic-ops", "teaching-assignments", homeroomId],
    queryFn: () => apiFetch<TeachingAssignment[]>({ service: "academic-ops", path: `/api/v1/academic-ops/homerooms/${homeroomId}/teaching-assignments`, authenticated: true }),
    enabled: Boolean(homeroomId),
  });
}
