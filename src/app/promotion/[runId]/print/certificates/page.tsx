"use client";

import { Suspense } from "react";
import type * as React from "react";
import { useParams, useSearchParams } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { CertificateDocument } from "@/components/features/promotion/certificate-document";
import { LetterPrintShell } from "@/components/features/promotion/letter-print";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors/messages";
import { usePromotionAccess } from "@/lib/query/queries/use-promotion";
import { useCertificatesPrint } from "@/lib/query/queries/use-promotion-letters";

export default function CertificatesPrintPage() {
  return (
    <AuthGuard fallback={<Skeleton className="m-6 h-[80vh]" />}>
      <Suspense fallback={<Skeleton className="m-6 h-[80vh]" />}>
        <CertificatesPrint />
      </Suspense>
    </AuthGuard>
  );
}

function CertificatesPrint() {
  const { runId } = useParams<{ runId: string }>();
  const student = useSearchParams().get("student") ?? undefined;
  const access = usePromotionAccess();
  const print = useCertificatesPrint(access.canRead ? runId : undefined, student);
  const issued = (print.data?.certificates ?? []).filter((c) => c.certificate_number);

  let body: React.ReactNode;
  if (access.isLoading || (access.canRead && print.isLoading)) {
    body = <Skeleton className="h-[80vh] w-full" />;
  } else if (!access.canRead) {
    body = <Notice title="Tidak punya akses" text="Halaman ini untuk pengelola atau penyetuju kenaikan kelas." />;
  } else if (print.error || !print.data) {
    body = <Notice title="Surat tidak bisa dimuat" text={getErrorMessage(print.error, { fallback: "Coba lagi nanti." })} />;
  } else if (issued.length === 0) {
    body = <Notice title="Belum ada surat terbit" text="Simpan nomor Surat Keterangan Lulus di tab Surat sebelum mencetak." />;
  } else {
    body = issued.map((c, i) => (
      <div key={c.student_id} className={i > 0 ? "break-before-page" : undefined}>
        <CertificateDocument certificate={c} letterhead={print.data!.letterhead} sourceYearName={print.data!.source_year_name} />
      </div>
    ));
  }

  return (
    <LetterPrintShell ready={issued.length > 0} backHref={`/promotion/${runId}`}>
      {body}
    </LetterPrintShell>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <Alert className="font-sans">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  );
}
