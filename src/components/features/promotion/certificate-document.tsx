import { Letterhead, SignatureBlock } from "@/components/features/promotion/letter-print";
import { formatLetterDate } from "@/lib/promotion/letters";
import type { Certificate, Letterhead as LetterheadData } from "@/lib/query/queries/use-promotion-letters";

/** Surat Keterangan Lulus for one issued graduate (spec §4.2). */
export function CertificateDocument({
  certificate: c,
  letterhead,
  sourceYearName,
}: {
  certificate: Certificate;
  letterhead: LetterheadData | null;
  sourceYearName: string | null;
}) {
  const school = c.school_name ?? letterhead?.school_name ?? "—";
  const birth = [c.birth_place, c.birth_date ? formatLetterDate(c.birth_date) : null].filter(Boolean).join(", ") || "—";
  const rows: [string, string][] = [
    ["Nama", c.full_name ?? "—"],
    ["Tempat, tanggal lahir", birth],
    ["NIS", c.nis ?? "—"],
    ["NISN", c.nisn ?? "—"],
    ["Kelas terakhir", c.last_homeroom_name ?? "—"],
  ];
  return (
    <article className="text-[12pt] leading-relaxed">
      <Letterhead letterhead={letterhead} schoolName={school} />
      <div className="my-6 text-center">
        <p className="font-bold underline">SURAT KETERANGAN LULUS</p>
        <p>Nomor: {c.certificate_number}</p>
      </div>
      <p>Yang bertanda tangan di bawah ini, Kepala {school} menerangkan bahwa:</p>
      <table className="my-4 ml-8">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="w-48 py-0.5 align-top">{label}</td>
              <td className="px-2 py-0.5 align-top">:</td>
              <td className="py-0.5 font-semibold">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-justify">
        telah <span className="font-bold">LULUS</span> dari {school} pada Tahun Ajaran {sourceYearName ?? "—"}, dengan
        tanggal kelulusan {formatLetterDate(c.graduation_date)}.
      </p>
      <p className="mt-2">Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
      <SignatureBlock
        city={c.city ?? "—"}
        date={c.letter_date ?? c.graduation_date}
        name={c.principal_name ?? "—"}
        nip={c.principal_nip}
      />
    </article>
  );
}
