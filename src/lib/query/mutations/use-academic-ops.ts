"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import type { EnrollmentForm, HomeroomForm, StudentForm, TeacherForm, TeachingAssignmentForm } from "@/lib/schemas/academic-ops";
import { HOMEROOMS_QUERY_KEY, STUDENTS_QUERY_KEY, TEACHING_ASSIGNMENTS_QUERY_KEY, TEACHERS_QUERY_KEY, type Homeroom, type Student, type Teacher, type TeachingAssignment } from "@/lib/query/queries/use-academic-ops";

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

export function useLinkTeacherAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teacherId, userId }: { teacherId: string; userId: string }) => apiFetch<Teacher>({ service: "academic-ops", path: `/api/v1/academic-ops/teachers/${teacherId}/account`, method: "PATCH", authenticated: true, body: { user_id: userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEACHERS_QUERY_KEY }),
  });
}

export function useLinkStudentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, userId }: { studentId: string; userId: string }) => apiFetch<Student>({ service: "academic-ops", path: `/api/v1/academic-ops/students/${studentId}/account`, method: "PATCH", authenticated: true, body: { user_id: userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY }),
  });
}

export function useLinkGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, userId }: { studentId: string; userId: string }) => apiFetch({ service: "academic-ops", path: `/api/v1/academic-ops/students/${studentId}/guardians`, method: "POST", authenticated: true, body: { user_id: userId } }),
    onSuccess: (_, { studentId }) => qc.invalidateQueries({ queryKey: [...STUDENTS_QUERY_KEY, studentId, "guardians"] }),
  });
}

export function useUnlinkGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, userId }: { studentId: string; userId: string }) => apiFetch({ service: "academic-ops", path: `/api/v1/academic-ops/students/${studentId}/guardians/${userId}`, method: "DELETE", authenticated: true }),
    onSuccess: (_, { studentId }) => qc.invalidateQueries({ queryKey: [...STUDENTS_QUERY_KEY, studentId, "guardians"] }),
  });
}

export function useUpdateTeacher(teacherId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TeacherForm) => apiFetch<Teacher>({ service: "academic-ops", path: `/api/v1/academic-ops/teachers/${teacherId}`, method: "PATCH", authenticated: true, body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEACHERS_QUERY_KEY }),
  });
}

export function useCreateHomeroom() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: HomeroomForm) => apiFetch<Homeroom>({ service: "academic-ops", path: "/api/v1/academic-ops/homerooms", method: "POST", authenticated: true, body: input }), onSuccess: () => qc.invalidateQueries({ queryKey: HOMEROOMS_QUERY_KEY }) });
}

export function useUpdateHomeroom(homeroomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<HomeroomForm>) => apiFetch<Homeroom>({ service: "academic-ops", path: `/api/v1/academic-ops/homerooms/${homeroomId}`, method: "PATCH", authenticated: true, body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: HOMEROOMS_QUERY_KEY }),
  });
}

export function useEnrollStudent(homeroomId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EnrollmentForm) => apiFetch({ service: "academic-ops", path: "/api/v1/academic-ops/enrollments", method: "POST", authenticated: true, body: input }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["academic-ops", "homeroom-roster", homeroomId] }),
        qc.invalidateQueries({ queryKey: ["academic-ops", "homeroom-enrollments", homeroomId] }),
        qc.invalidateQueries({ queryKey: HOMEROOMS_QUERY_KEY }),
      ]);
    },
  });
}

export function useUnenrollStudent(homeroomId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) => apiFetch({ service: "academic-ops", path: `/api/v1/academic-ops/enrollments/${enrollmentId}`, method: "DELETE", authenticated: true }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["academic-ops", "homeroom-roster", homeroomId] }),
        qc.invalidateQueries({ queryKey: ["academic-ops", "homeroom-enrollments", homeroomId] }),
        qc.invalidateQueries({ queryKey: HOMEROOMS_QUERY_KEY }),
      ]);
    },
  });
}

export function useAssignTeaching(homeroomId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TeachingAssignmentForm) => apiFetch<TeachingAssignment>({ service: "academic-ops", path: "/api/v1/academic-ops/teaching-assignments", method: "POST", authenticated: true, body: input }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: TEACHING_ASSIGNMENTS_QUERY_KEY }),
        homeroomId ? qc.invalidateQueries({ queryKey: ["academic-ops", "teaching-assignments", "homeroom", homeroomId] }) : Promise.resolve(),
      ]);
    },
  });
}

// --- delete / bulk-delete ---------------------------------------------------

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => apiFetch({ service: "academic-ops", path: `/api/v1/academic-ops/students/${studentId}`, method: "DELETE", authenticated: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY }),
  });
}

export function useBulkDeleteStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentIds: string[]) => apiFetch({ service: "academic-ops", path: "/api/v1/academic-ops/students/bulk-delete", method: "POST", authenticated: true, body: { student_ids: studentIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY }),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teacherId: string) => apiFetch({ service: "academic-ops", path: `/api/v1/academic-ops/teachers/${teacherId}`, method: "DELETE", authenticated: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEACHERS_QUERY_KEY }),
  });
}

export function useBulkDeleteTeachers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teacherIds: string[]) => apiFetch({ service: "academic-ops", path: "/api/v1/academic-ops/teachers/bulk-delete", method: "POST", authenticated: true, body: { teacher_ids: teacherIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEACHERS_QUERY_KEY }),
  });
}

export function useDeleteHomeroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (homeroomId: string) => apiFetch({ service: "academic-ops", path: `/api/v1/academic-ops/homerooms/${homeroomId}`, method: "DELETE", authenticated: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: HOMEROOMS_QUERY_KEY }),
  });
}

export function useBulkDeleteHomerooms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (homeroomIds: string[]) => apiFetch({ service: "academic-ops", path: "/api/v1/academic-ops/homerooms/bulk-delete", method: "POST", authenticated: true, body: { homeroom_ids: homeroomIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: HOMEROOMS_QUERY_KEY }),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => apiFetch({ service: "academic-ops", path: `/api/v1/academic-ops/teaching-assignments/${assignmentId}`, method: "DELETE", authenticated: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEACHING_ASSIGNMENTS_QUERY_KEY }),
  });
}

export function useBulkDeleteAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentIds: string[]) => apiFetch({ service: "academic-ops", path: "/api/v1/academic-ops/teaching-assignments/bulk-delete", method: "POST", authenticated: true, body: { assignment_ids: assignmentIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEACHING_ASSIGNMENTS_QUERY_KEY }),
  });
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
