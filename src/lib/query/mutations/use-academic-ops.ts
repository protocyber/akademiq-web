"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import type { EnrollmentForm, HomeroomForm, StudentForm, TeacherForm, TeachingAssignmentForm } from "@/lib/schemas/academic-ops";
import { HOMEROOMS_QUERY_KEY, STUDENTS_QUERY_KEY, TEACHERS_QUERY_KEY, type Homeroom, type Student, type Teacher, type TeachingAssignment } from "@/lib/query/queries/use-academic-ops";

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: StudentForm) => apiFetch<Student>({ service: "academic-ops", path: "/api/v1/academic-ops/students", method: "POST", authenticated: true, body: input }), onSuccess: () => qc.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY }) });
}

export function useUpdateStudent(studentId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: Partial<StudentForm>) => apiFetch<Student>({ service: "academic-ops", path: `/api/v1/academic-ops/students/${studentId}`, method: "PATCH", authenticated: true, body: input }), onSuccess: () => qc.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY }) });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: TeacherForm) => apiFetch<Teacher>({ service: "academic-ops", path: "/api/v1/academic-ops/teachers", method: "POST", authenticated: true, body: input }), onSuccess: () => qc.invalidateQueries({ queryKey: TEACHERS_QUERY_KEY }) });
}

export function useCreateHomeroom() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: HomeroomForm) => apiFetch<Homeroom>({ service: "academic-ops", path: "/api/v1/academic-ops/homerooms", method: "POST", authenticated: true, body: input }), onSuccess: () => qc.invalidateQueries({ queryKey: HOMEROOMS_QUERY_KEY }) });
}

export function useEnrollStudent(homeroomId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EnrollmentForm) => apiFetch({ service: "academic-ops", path: "/api/v1/academic-ops/enrollments", method: "POST", authenticated: true, body: input }),
    onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["academic-ops", "homeroom-roster", homeroomId] }), qc.invalidateQueries({ queryKey: HOMEROOMS_QUERY_KEY })]); },
  });
}

export function useAssignTeaching(homeroomId?: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: TeachingAssignmentForm) => apiFetch<TeachingAssignment>({ service: "academic-ops", path: "/api/v1/academic-ops/teaching-assignments", method: "POST", authenticated: true, body: input }), onSuccess: () => qc.invalidateQueries({ queryKey: ["academic-ops", "teaching-assignments", homeroomId] }) });
}

export function useImportStudents() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (file: File) => upload("/api/v1/academic-ops/imports/students", file), onSuccess: () => qc.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY }) });
}

export function useImportTeachers() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (file: File) => upload("/api/v1/academic-ops/imports/teachers", file), onSuccess: () => qc.invalidateQueries({ queryKey: TEACHERS_QUERY_KEY }) });
}

function upload(path: string, file: File) {
  const body = new FormData();
  body.set("file", file);
  return apiFetch<{ imported: number }>({ service: "academic-ops", path, method: "POST", authenticated: true, body });
}
