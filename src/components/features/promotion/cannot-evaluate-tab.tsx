"use client";

import { useQueries } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { STUDENTS_QUERY_KEY, type Student } from "@/lib/query/queries/use-academic-ops";

export function CannotEvaluateTab({ studentIds }: { studentIds: string[] }) {
  const students = useQueries({
    queries: studentIds.map((id) => ({
      queryKey: [...STUDENTS_QUERY_KEY, id],
      queryFn: () =>
        apiFetch<Student>({ service: "academic-ops", path: `/api/v1/academic-ops/students/${id}`, authenticated: true }),
    })),
  });

  if (studentIds.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Semua siswa bisa dievaluasi.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Siswa berikut belum punya rapor terbit pada tipe rapor sumber kenaikan, sehingga tidak dievaluasi dan tidak
        dianggap tinggal kelas. Terbitkan rapornya lalu evaluasi ulang.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>NIS</TableHead>
            <TableHead>Nama</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((q, i) => (
            <TableRow key={studentIds[i]}>
              {q.isLoading ? (
                <TableCell colSpan={2}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              ) : (
                <>
                  <TableCell className="tabular-nums">{q.data?.nis ?? "—"}</TableCell>
                  <TableCell>{q.data?.full_name ?? studentIds[i]}</TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
