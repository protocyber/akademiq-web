"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import type { DashboardStats } from "@/lib/query/queries/use-dashboard-stats";

interface DashboardChartsProps {
  stats: DashboardStats;
}

export function DashboardCharts({ stats }: DashboardChartsProps) {
  // Data untuk bar chart: siswa per kelas
  const gradeChartData = stats.students_by_grade.map((item) => ({
    name: item.homeroom_name,
    siswa: item.student_count,
    kapasitas: item.capacity,
  }));

  // Data untuk donut chart: distribusi gender
  const genderChartData = [
    { name: "Laki-laki", value: stats.gender_breakdown.male },
    { name: "Perempuan", value: stats.gender_breakdown.female },
  ];

  const COLORS = ["#3b82f6", "#ec4899"];

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Bar Chart: Siswa per Kelas */}
      <Card className="lg:col-span-3 border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Siswa per Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          {gradeChartData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              Belum ada data kelas
            </div>
          ) : (
            <ChartContainer
              config={{
                siswa: {
                  label: "Siswa",
                  color: "hsl(var(--chart-1))",
                },
                kapasitas: {
                  label: "Kapasitas",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px] w-full"
            >
              <BarChart data={gradeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                  dataKey="siswa"
                  fill="var(--color-siswa)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="kapasitas"
                  fill="var(--color-kapasitas)"
                  radius={[4, 4, 0, 0]}
                  opacity={0.3}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Donut Chart: Distribusi Gender */}
      <Card className="lg:col-span-2 border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Distribusi Gender</CardTitle>
        </CardHeader>
        <CardContent>
          {genderChartData.every((item) => item.value === 0) ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              Belum ada data siswa
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <ChartContainer
                config={{
                  "Laki-laki": {
                    label: "Laki-laki",
                    color: "#3b82f6",
                  },
                  "Perempuan": {
                    label: "Perempuan",
                    color: "#ec4899",
                  },
                }}
                className="h-[250px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Pie
                    data={genderChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {genderChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex gap-6">
                {genderChartData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
