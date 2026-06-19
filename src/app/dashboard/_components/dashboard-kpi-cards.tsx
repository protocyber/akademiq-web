"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, School, BookOpen } from "lucide-react";
import type { DashboardStats } from "@/lib/query/queries/use-dashboard-stats";

interface DashboardKpiCardsProps {
  stats: DashboardStats;
  subjectCount: number;
}

export function DashboardKpiCards({ stats, subjectCount }: DashboardKpiCardsProps) {
  const kpis = [
    {
      title: "Siswa Aktif",
      value: stats.total_students,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Guru Aktif",
      value: stats.total_teachers,
      icon: GraduationCap,
      color: "text-green-600",
    },
    {
      title: "Kelas",
      value: stats.total_homerooms,
      icon: School,
      color: "text-purple-600",
    },
    {
      title: "Mata Pelajaran",
      value: subjectCount,
      icon: BookOpen,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="border border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </p>
                <p className="text-3xl font-bold tracking-tight mt-1">
                  {kpi.value.toLocaleString("id-ID")}
                </p>
              </div>
              <div className={`rounded-lg bg-muted p-3 ${kpi.color}`}>
                <kpi.icon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
