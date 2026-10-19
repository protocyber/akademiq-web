"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { ReportCardPrintStyles } from "@/components/features/grading/report-card-print-document";
import { Button } from "@/components/ui/button";
import { formatLetterDate } from "@/lib/promotion/letters";
import type { Letterhead as LetterheadData } from "@/lib/query/queries/use-promotion-letters";

/** Kop surat. `schoolName` is the letter's snapshot; the rest is the live letterhead. */
export function Letterhead({ letterhead, schoolName }: { letterhead: LetterheadData | null; schoolName: string }) {
  const address = [
    letterhead?.address_line,
    letterhead?.village,
    letterhead?.subdistrict,
    letterhead?.city_regency,
    letterhead?.province,
    letterhead?.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
  const contact = [letterhead?.phone_number && `Telp. ${letterhead.phone_number}`, letterhead?.email]
    .filter(Boolean)
    .join(" · ");
  return (
    <header className="flex items-center gap-4 border-b-[3px] border-double border-black pb-3">
      {letterhead?.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- print page; next/image needs remote config and adds nothing here
        <img src={letterhead.logo_url} alt="Logo sekolah" className="h-20 w-20 object-contain" />
      ) : null}
      <div className="flex-1 text-center">
        <p className="text-xl font-bold uppercase">{schoolName}</p>
        {letterhead?.npsn ? <p className="text-sm">NPSN {letterhead.npsn}</p> : null}
        {address ? <p className="text-sm">{address}</p> : null}
        {contact ? <p className="text-sm">{contact}</p> : null}
      </div>
    </header>
  );
}

export function SignatureBlock({
  city,
  date,
  name,
  nip,
}: {
  city: string;
  date: string;
  name: string;
  nip: string | null;
}) {
  return (
    <div className="mt-10 flex justify-end break-inside-avoid">
      <div className="w-64 text-center">
        <p>
          {city}, {formatLetterDate(date)}
        </p>
        <p>Kepala Sekolah,</p>
        <div className="h-20" />
        <p className="font-bold underline">{name}</p>
        {nip ? <p>NIP. {nip}</p> : null}
      </div>
    </div>
  );
}

/** Back button (not printed) and one `window.print()` once `ready`. */
export function LetterPrintShell({
  ready,
  backHref,
  children,
}: {
  ready: boolean;
  backHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const printed = React.useRef(false);

  React.useEffect(() => {
    if (!ready || printed.current) return;
    printed.current = true;
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, [ready]);

  function back() {
    if (window.opener) window.close();
    else router.push(backHref);
  }

  return (
    <main className="mx-auto min-h-screen bg-white p-6 font-serif text-black sm:p-12 md:max-w-[210mm] print:m-0 print:max-w-none print:p-0">
      <ReportCardPrintStyles />
      <div className="mb-6 flex items-center border-b pb-4 font-sans print:hidden">
        <Button variant="ghost" onClick={back} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
      </div>
      {children}
    </main>
  );
}
