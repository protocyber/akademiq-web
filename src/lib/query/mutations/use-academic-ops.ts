"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import type {
  EnrollmentForm,
  FamilyLinkForm,
  FamilyLinkUpdateForm,
  FamilyProfileForm,
  HomeroomForm,
  StudentForm,
  TeacherForm,
  TeachingAssignmentForm,
} from "@/lib/schemas/academic-ops";
import {
  FAMILIES_QUERY_KEY,
  HOMEROOMS_QUERY_KEY,
  MEDIA_QUERY_KEY,
  STUDENTS_QUERY_KEY,
  TEACHING_ASSIGNMENTS_QUERY_KEY,
  TEACHERS_QUERY_KEY,
  type FamilyProfile,
  type Homeroom,
  type MediaAsset,
  type Student,
  type StudentFamilyLink,
  type Teacher,
  type TeachingAssignment,
} from "@/lib/query/queries/use-academic-ops";

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

// --- archive ---------------------------------------------------------------

export function useArchiveStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, reason }: { studentId: string; reason: string }) =>
      apiFetch<Student>({ service: "academic-ops", path: `/api/v1/academic-ops/students/${studentId}/archive`, method: "POST", authenticated: true, body: { reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY }),
  });
}

export function useArchiveTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teacherId, reason }: { teacherId: string; reason: string }) =>
      apiFetch<Teacher>({ service: "academic-ops", path: `/api/v1/academic-ops/teachers/${teacherId}/archive`, method: "POST", authenticated: true, body: { reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEACHERS_QUERY_KEY }),
  });
}

export function useArchiveFamilyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ familyId, reason }: { familyId: string; reason: string }) =>
      apiFetch<FamilyProfile>({ service: "academic-ops", path: `/api/v1/academic-ops/family-profiles/${familyId}/archive`, method: "POST", authenticated: true, body: { reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILIES_QUERY_KEY }),
  });
}

// --- family profiles -------------------------------------------------------

type CreateFamilyResult = {
  family: FamilyProfile;
  duplicate_warning: {
    duplicates: { family_id: string; full_name: string; nik?: string | null; phone_number?: string | null; matched_on: string }[];
  } | null;
};

export function useCreateFamilyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FamilyProfileForm) =>
      apiFetch<CreateFamilyResult>({ service: "academic-ops", path: "/api/v1/academic-ops/family-profiles", method: "POST", authenticated: true, body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILIES_QUERY_KEY }),
  });
}

export function useUpdateFamilyProfile(familyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<FamilyProfileForm>) =>
      apiFetch<FamilyProfile>({ service: "academic-ops", path: `/api/v1/academic-ops/family-profiles/${familyId}`, method: "PATCH", authenticated: true, body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILIES_QUERY_KEY }),
  });
}

export function useDeleteFamilyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (familyId: string) =>
      apiFetch({ service: "academic-ops", path: `/api/v1/academic-ops/family-profiles/${familyId}`, method: "DELETE", authenticated: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FAMILIES_QUERY_KEY }),
  });
}

// --- student-family links --------------------------------------------------

export function useCreateFamilyLink(studentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FamilyLinkForm & { studentId: string }) =>
      apiFetch<StudentFamilyLink>({
        service: "academic-ops",
        path: `/api/v1/academic-ops/students/${input.studentId}/family-links`,
        method: "POST",
        authenticated: true,
        body: { family_id: input.family_id, relationship_type: input.relationship_type, primary_contact: input.primary_contact, emergency_contact: input.emergency_contact, lives_with_student: input.lives_with_student, financial_responsible: input.financial_responsible },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...STUDENTS_QUERY_KEY, studentId, "family-links"] });
      qc.invalidateQueries({ queryKey: FAMILIES_QUERY_KEY });
    },
  });
}

export function useUpdateFamilyLink(studentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId, ...input }: { linkId: string } & FamilyLinkUpdateForm) =>
      apiFetch<StudentFamilyLink>({ service: "academic-ops", path: `/api/v1/academic-ops/family-links/${linkId}`, method: "PATCH", authenticated: true, body: input }),
    onSuccess: () => {
      if (studentId) qc.invalidateQueries({ queryKey: [...STUDENTS_QUERY_KEY, studentId, "family-links"] });
    },
  });
}

export function useInactivateFamilyLink(studentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) =>
      apiFetch({ service: "academic-ops", path: `/api/v1/academic-ops/family-links/${linkId}/inactivate`, method: "POST", authenticated: true }),
    onSuccess: () => {
      if (studentId) qc.invalidateQueries({ queryKey: [...STUDENTS_QUERY_KEY, studentId, "family-links"] });
    },
  });
}

export function useDeleteFamilyLink(studentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) =>
      apiFetch({ service: "academic-ops", path: `/api/v1/academic-ops/family-links/${linkId}`, method: "DELETE", authenticated: true }),
    onSuccess: () => {
      if (studentId) qc.invalidateQueries({ queryKey: [...STUDENTS_QUERY_KEY, studentId, "family-links"] });
    },
  });
}

// --- media upload -----------------------------------------------------------

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerType, ownerId, file }: { ownerType: string; ownerId: string; file: File }) => {
      const body = new FormData();
      body.set("owner_type", ownerType);
      body.set("owner_id", ownerId);
      body.set("file", file);
      return apiFetch<MediaAsset>({ service: "academic-ops", path: "/api/v1/academic-ops/media", method: "POST", authenticated: true, body });
    },
    onSuccess: (_, { ownerType, ownerId }) => {
      qc.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
      // Also invalidate the owner entity to refresh photo_media_id
      if (ownerType === "student") qc.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY });
      if (ownerType === "teacher") qc.invalidateQueries({ queryKey: TEACHERS_QUERY_KEY });
      if (ownerType === "family") qc.invalidateQueries({ queryKey: FAMILIES_QUERY_KEY });
    },
  });
}

export function useUploadSchoolLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.set("file", file);
      return apiFetch<MediaAsset>({ service: "billing", path: "/api/v1/billing/tenants/me/school-profile/media", method: "POST", authenticated: true, body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing", "school-profile"] });
      qc.invalidateQueries({ queryKey: ["billing", "school-media"] });
    },
  });
}
