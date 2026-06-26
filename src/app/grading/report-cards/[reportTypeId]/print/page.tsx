"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AuthGuard } from "@/components/features/auth-guard";
import { ReportCardPrintDocument, ReportCardPrintStyles } from "@/components/features/grading/report-card-print-document";
import { Button } from "@/components/ui/button";

export default function PrintReportCardPage() {
  return (
    <AuthGuard fallback={<PageSkeleton />}>
      <PrintReportCardShell />
    </AuthGuard>
  );
}

function PrintReportCardShell() {
  const params = useParams<{ reportTypeId: string }>();
  const router = useRouter();
  const printed = React.useRef(false);

  // Auto-trigger the browser print dialog once the card has settled.
  const handleReady = React.useCallback(() => {
    if (printed.current) return;
    printed.current = true;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

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
      </div>

      <ReportCardPrintDocument reportCardId={params.reportTypeId} onReady={handleReady} />
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
