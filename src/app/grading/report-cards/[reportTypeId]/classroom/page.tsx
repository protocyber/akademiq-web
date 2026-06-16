"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ReportCardsShell } from "@/components/features/grading/report-cards-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomerooms } from "@/lib/query/queries/use-academic-ops";

export default function ClassroomPickerPage() {
  const params = useParams<{ reportTypeId: string }>();
  const reportTypeId = params.reportTypeId;
  const homerooms = useHomerooms();
  const router = useRouter();

  return (
    <ReportCardsShell title="Pilih Kelas" description="Pilih kelas untuk membuka papan rapor.">
      <Button asChild variant="ghost" size="sm">
        <Link href="/grading/report-cards">← Kembali ke jenis rapor</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Kelas</CardTitle>
          <CardDescription>Pilih kelas yang akan dikelola rapornya.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {homerooms.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (homerooms.data ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada kelas.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Kelas</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(homerooms.data ?? []).map((room) => (
                    <tr key={room.homeroom_id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{room.name}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => router.push(`/grading/report-cards/${reportTypeId}/classroom/${room.homeroom_id}`)}>
                          Buka
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </ReportCardsShell>
  );
}
