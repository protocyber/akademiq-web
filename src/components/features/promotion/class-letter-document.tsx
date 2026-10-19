import { Letterhead, SignatureBlock } from "@/components/features/promotion/letter-print";
import type { ClassLetterPrint, ClassLetterStudent } from "@/lib/query/queries/use-promotion-letters";

export function classLetterResultText(s: ClassLetterStudent): string {
  if (s.result === "graduate") return "Lulus";
  const target = s.target_homeroom_name ?? "—";
  return s.result === "promote" ? `Naik ke kelas ${target}` : `Tinggal di kelas ${target}`;
}

/** SK Kenaikan Kelas for one source homeroom (spec §4.2). Needs `data.letter`. */
export function ClassLetterDocument({ data }: { data: ClassLetterPrint }) {
  const letter = data.letter!;
  const year = data.source_year_name ?? "—";
  return (
    <article className="text-[12pt] leading-relaxed">
      <Letterhead letterhead={data.letterhead} schoolName={letter.school_name} />
      <div className="my-6 text-center">
        <p className="font-bold underline">SURAT KEPUTUSAN KEPALA SEKOLAH</p>
        <p>Nomor: {letter.letter_number}</p>
        <p className="mt-2 font-bold">Tentang Kenaikan Kelas Tahun Ajaran {year}</p>
      </div>
      <p className="text-justify">
        Kepala {letter.school_name}, berdasarkan hasil evaluasi akhir Tahun Ajaran {year} dan keputusan rapat dewan
        guru, menetapkan hasil kenaikan kelas siswa kelas {data.homeroom_name ?? "—"} sebagai berikut
        {data.target_year_name ? `, berlaku untuk Tahun Ajaran ${data.target_year_name}` : ""}:
      </p>
      <table className="mt-4 w-full border-collapse text-[11pt]">
        <thead className="table-header-group">
          <tr>
            <th className="border border-black px-2 py-1">No</th>
            <th className="border border-black px-2 py-1 text-left">Nama</th>
            <th className="border border-black px-2 py-1">NIS / NISN</th>
            <th className="border border-black px-2 py-1 text-left">Hasil</th>
          </tr>
        </thead>
        <tbody>
          {data.students.map((s, i) => (
            <tr key={s.student_id} className="break-inside-avoid">
              <td className="border border-black px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-black px-2 py-1">{s.full_name ?? "—"}</td>
              <td className="border border-black px-2 py-1 text-center">
                {s.nis ?? "—"}
                {s.nisn ? ` / ${s.nisn}` : ""}
              </td>
              <td className="border border-black px-2 py-1">{classLetterResultText(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-justify">
        Keputusan ini berlaku sejak tanggal ditetapkan. Apabila di kemudian hari terdapat kekeliruan, akan diperbaiki
        sebagaimana mestinya.
      </p>
      <SignatureBlock
        city={letter.city}
        date={letter.letter_date}
        name={letter.principal_name}
        nip={letter.principal_nip}
      />
    </article>
  );
}
