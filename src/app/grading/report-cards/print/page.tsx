"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AuthGuard } from "@/components/features/auth-guard";
import { ReportCardPrintDocument, ReportCardPrintStyles } from "@/components/features/grading/report-card-print-document";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { readBulkPrintIds } from "@/lib/report-cards/bulk-print";

export default function BatchPrintReportCardsPage() {
  return (
    <AuthGuard fallback={<PageSkeleton />}>
      <BatchPrintReportCardsShell />
    </AuthGuard>
  );
}

function BatchPrintReportCardsShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBatch = searchParams.get("batch") === "true";

  const [ids, setIds] = React.useState<string[] | null>(null);
  React.useEffect(() => {
    setIds(readBulkPrintIds());
  }, []);

  const printed = React.useRef(false);
  const readyCount = React.useRef(0);
  const [ready, setReady] = React.useState(0);

  const handleReady = React.useCallback(() => {
    readyCount.current += 1;
    setReady(readyCount.current);
  }, []);

  React.useEffect(() => {
    if (printed.current) return;
    if (ids === null || ids.length === 0) return;
    if (ready >= ids.length) {
      printed.current = true;
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [ready, ids]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.opener) {
      window.close();
    } else {
      router.push(`/grading/report-cards`);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black font-sans p-6 sm:p-12 md:max-w-[210mm] mx-auto print:p-0 print:m-0 print:max-w-none">
      <ReportCardPrintStyles />

      <div className="mb-6 flex items-center border-b pb-4 print:hidden">
        <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
        {isBatch && ids && ids.length > 0 ? (
          <span className="ml-2 text-sm text-muted-foreground">Mencetak {ids.length} rapor</span>
        ) : null}
      </div>

      {ids === null ? (
        <PageSkeleton />
      ) : ids.length === 0 ? (
        <div className="p-6">
          <Alert>
            <AlertTitle>Tidak ada rapor untuk dicetak</AlertTitle>
            <AlertDescription>
              Pilih satu atau lebih rapor di papan rapor, lalu gunakan &quot;Cetak Terpilih&quot;.
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        ids.map((id, index) => (
          <div key={id} className={index > 0 ? "break-before-page" : undefined}>
            <ReportCardPrintDocument reportCardId={id} onReady={handleReady} />
          </div>
        ))
      )}
    </main>
  );
}

function PageSkeleton() {
  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <h3 className="font-bold text-lg text-gray-800">Menyiapkan Dokumen Rapor</h3>
          <p className="text-sm text-gray-500 mt-1">Mohon tunggu sebentar, data sedang dimuat...</p>
        </div>
      </div>
    </main>
  );
}
