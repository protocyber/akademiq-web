"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { useAcademicScope } from "@/hooks/use-academic-scope";

export type StudentByGrade = {
  grade_level: string;
  homeroom_name: string;
  student_count: number;
  capacity: number;
};

export type GenderBreakdown = {
  male: number;
  female: number;
};

export type DashboardStats = {
  total_students: number;
  total_teachers: number;
  total_homerooms: number;
  gender_breakdown: GenderBreakdown;
  students_by_grade: StudentByGrade[];
};

export function useDashboardStats() {
  const { yearId, isResolving } = useAcademicScope();

  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", yearId],
    enabled: !!yearId && !isResolving,
    queryFn: () =>
      apiFetch<DashboardStats>({
        service: "academic-ops",
        path: `/api/v1/academic-ops/dashboard/stats?academic_year_id=${yearId}`,
        authenticated: true,
      }),
  });
}
