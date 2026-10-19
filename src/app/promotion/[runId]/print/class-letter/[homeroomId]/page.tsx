"use client";

import type * as React from "react";
import { useParams } from "next/navigation";

import { AuthGuard } from "@/components/features/auth-guard";
import { ClassLetterDocument } from "@/components/features/promotion/class-letter-document";
import { LetterPrintShell } from "@/components/features/promotion/letter-print";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors/messages";
import { usePromotionAccess } from "@/lib/query/queries/use-promotion";
import { useClassLetterPrint } from "@/lib/query/queries/use-promotion-letters";

export default function ClassLetterPrintPage() {
  return (
    <AuthGuard fallback={<Skeleton className="m-6 h-[80vh]" />}>
      <ClassLetterPrint />
    </AuthGuard>
  );
}

function ClassLetterPrint() {
  const { runId, homeroomId } = useParams<{ runId: string; homeroomId: string }>();
  const access = usePromotionAccess();
  const print = useClassLetterPrint(access.canRead ? runId : undefined, homeroomId);
  const backHref = `/promotion/${runId}`;

  let body: React.ReactNode;
  if (access.isLoading || (access.canRead && print.isLoading)) {
    body = <Skeleton className="h-[80vh] w-full" />;
  } else if (!access.canRead) {
    body = <Notice title="Tidak punya akses" text="Halaman ini untuk pengelola atau penyetuju kenaikan kelas." />;
  } else if (print.error || !print.data) {
    body = <Notice title="Surat tidak bisa dimuat" text={getErrorMessage(print.error, { fallback: "Coba lagi nanti." })} />;
  } else if (!print.data.letter) {
    body = <Notice title="SK belum terbit" text="Terbitkan nomor SK untuk kelas ini di tab Surat sebelum mencetak." />;
  } else {
    body = <ClassLetterDocument data={print.data} />;
  }

  return (
    <LetterPrintShell ready={Boolean(print.data?.letter)} backHref={backHref}>
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
