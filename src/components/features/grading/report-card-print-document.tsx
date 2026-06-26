"use client";

import * as React from "react";
import Image from "next/image";

import { groupScoresByKelompok } from "@/components/features/grading/report-card-detail-body";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useSubjectsForYear } from "@/lib/query/queries/use-academic-config";
import { useReportCardDetail } from "@/lib/query/queries/use-grading";
import { useHomeroomRoster, useTeachers, useHomerooms, useTeachingAssignments, useMediaAssets } from "@/lib/query/queries/use-academic-ops";
import { useSchoolMedia } from "@/lib/query/queries/use-school-profile";

export function ReportCardPrintStyles() {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
      @media print {
        html, body {
          background-color: white !important;
          color: black !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print\\:hidden {
          display: none !important;
        }
      }
      @page {
        size: A4;
        margin: 6mm;
      }
    ` }} />
  );
}

function scoreToIndonesianWords(score: number): string {
  const units = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  const val = Math.round(score);

  if (val === 0) return "Nol";
  if (val < 12) return units[val];
  if (val < 20) return units[val - 10] + " Belas";
  if (val < 100) {
    const tens = Math.floor(val / 10);
    const ones = val % 10;
    return units[tens] + " Puluh" + (ones > 0 ? " " + units[ones] : "");
  }
  if (val === 100) return "Seratus";
  return val.toString();
}

function SchoolSeal() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <defs>
        <path id="sealTop" d="M 18,50 A 32,32 0 1,1 82,50" />
        <path id="sealBottom" d="M 82,50 A 32,32 0 0,1 18,50" />
      </defs>
      <circle cx="50" cy="50" r="48" fill="#0d4b31" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#f8f0d9" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#c7a243" strokeWidth="2" />
      <text fontFamily="Georgia" fontSize="7" fontWeight="700" fill="#f8f0d9" letterSpacing="0.8">
        <textPath href="#sealTop" startOffset="50%" textAnchor="middle">TPQ BAITUR ROCHMAN</textPath>
      </text>
      <text fontFamily="Georgia" fontSize="5.5" fontWeight="700" fill="#f8f0d9" letterSpacing="0.4">
        <textPath href="#sealBottom" startOffset="50%" textAnchor="middle">SURABAYA</textPath>
      </text>
      <g transform="translate(50 51)">
        <path d="M-22 14h44l-7 8h-30z" fill="#c7a243" />
        <path d="M-16 10h32l-6-14h-20z" fill="#7a3f13" />
        <path d="M-22-2c10-4 18-1 22 4 4-5 12-8 22-4l-4-11c-10-2-16 1-18 5-2-4-8-7-18-5z" fill="#fffdf7" stroke="#0d4b31" strokeWidth="0.8" />
        <path d="M-27 4c5 10 15 16 27 16S22 14 27 4" fill="none" stroke="#f8f0d9" strokeWidth="2" />
        {[-18, -9, 0, 9, 18].map((x, index) => (
          <path key={x} d="M0-4l1.2 2.6 2.8.3-2.1 1.9.6 2.8L0 2.2l-2.5 1.4.6-2.8L-4-1.1l2.8-.3z" transform={`translate(${x} ${index % 2 === 0 ? -21 : -24})`} fill="#c7a243" />
        ))}
      </g>
    </svg>
  );
}

function TitleRibbon() {
  return (
    <div className="relative h-[82px] w-[540px] max-w-full">
      <Image src="/report-card-assets/title.png?v=2" alt="" fill sizes="540px" className="object-contain" priority unoptimized />
      <div className="absolute inset-x-[54px] top-[36px] text-center font-serif text-[11px] font-extrabold uppercase leading-none tracking-[0.01em] text-[#fff8e7] drop-shadow-sm">
        RAPOR PRESTASI SANTRI SUMATIF GANJIL - GENAP
      </div>
    </div>
  );
}

function BulletIcon({ className = "h-[14px] w-[14px]", transparent = false }: { className?: string; transparent?: boolean; }) {
  return <Image src={`/report-card-assets/${transparent ? "bullet-trans" : "bullet"}.png?v=2`} alt="" width={38} height={38} className={className} unoptimized />;
}

function SectionBadge({ children }: { children: React.ReactNode; }) {
  return (
    <div className="mb-1.5 inline-flex items-center gap-2 rounded-r-full rounded-l-md bg-[#0d4b31] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#fff8e7] shadow-[inset_0_0_0_1px_rgba(199,162,67,0.9)]">
      <BulletIcon transparent />
      {children}
    </div>
  );
}

function CornerImage({ corner }: { corner: "tl" | "tr" | "bl" | "br"; }) {
  const classes = {
    tl: "left-0 top-0",
    tr: "right-0 top-0",
    bl: "bottom-0 left-0",
    br: "bottom-0 right-0",
  }[corner];

  return (
    <Image src={`/report-card-assets/corner-${corner}.png?v=2`} alt="" width={25} height={28} className={`pointer-events-none absolute ${classes} z-10 h-[22px] w-[20px]`} unoptimized />
  );
}

function QualificationBox() {
  return (
    <div className="relative mt-2 w-full px-4 py-3 font-sans text-[11px] shadow-sm">
      <div className="pointer-events-none absolute left-[18px] right-[18px] top-0 border-t border-[#d2ad4c] border-2" />
      <div className="pointer-events-none absolute bottom-0 left-[18px] right-[18px] border-b border-[#d2ad4c] border-2" />
      <div className="pointer-events-none absolute bottom-[20px] left-0 top-[20px] border-l border-[#d2ad4c] border-2" />
      <div className="pointer-events-none absolute bottom-[20px] right-0 top-[20px] border-r border-[#d2ad4c] border-2" />
      <CornerImage corner="tl" />
      <CornerImage corner="tr" />
      <CornerImage corner="bl" />
      <CornerImage corner="br" />
      <div className="relative z-20 mb-2 flex items-center justify-center gap-3 border-b border-[#d2ad4c] pb-1.5">
        <BulletIcon className="h-[15px] w-[15px]" />
        <h2 className="font-serif text-[12px] font-extrabold uppercase tracking-wide text-[#20231f]">Kualifikasi Nilai</h2>
        <BulletIcon className="h-[15px] w-[15px]" />
      </div>
      <div className="relative z-20 space-y-1.5 font-semibold">
        <div className="flex justify-between"><span>A = 90 - 100</span><span className="text-[#0d4b31]">( Amat Baik )</span></div>
        <div className="flex justify-between"><span>B = 80 - 89</span><span className="text-[#0d4b31]">( Baik )</span></div>
        <div className="flex justify-between"><span>C = 60 - 79</span><span className="text-[#ad7f15]">( Cukup )</span></div>
        <div className="flex justify-between"><span>D = 50 - 59</span><span className="text-[#b4232f]">( Remidi )</span></div>
      </div>
    </div>
  );
}

function SignatureLine({ title, name }: { title: string; name?: string; }) {
  return (
    <div className="flex h-[92px] flex-col justify-between text-center text-[11px] font-semibold text-[#1d271f]">
      <div>{title}</div>
      <div className="font-serif text-[11px] font-bold text-[#1b3427]">( <span className="inline-block min-w-[124px] border-b border-[#1d271f] px-2">{name ?? ""}</span> )</div>
    </div>
  );
}

export function ReportCardPrintDocument({ reportCardId, onReady }: { reportCardId: string; onReady?: () => void; }) {
  const tenant = useTenantMe();
  const detail = useReportCardDetail(reportCardId);
  const card = detail.data?.report_card;
  const roster = useHomeroomRoster(card?.homeroom_id);
  const teachers = useTeachers();
  const homerooms = useHomerooms();
  const subjects = useSubjectsForYear(card?.academic_year_id);
  const assignments = useTeachingAssignments(card?.homeroom_id);
  const schoolMedia = useSchoolMedia();
  const student = (roster.data ?? []).find((s) => s.student_id === card?.student_id);
  const studentMedia = useMediaAssets("student", student?.student_id);
  const studentPhoto = studentMedia.data?.find((asset) => asset.is_active) ?? studentMedia.data?.[0];
  const schoolLogo = schoolMedia.data?.find((asset) => asset.is_active) ?? schoolMedia.data?.[0];

  const isLoading =
    tenant.isLoading || detail.isLoading || roster.isLoading || teachers.isLoading || homerooms.isLoading || subjects.isLoading || assignments.isLoading || studentMedia.isLoading || schoolMedia.isLoading;

  const readyCalled = React.useRef(false);
  React.useEffect(() => {
    if (!isLoading && !readyCalled.current) {
      readyCalled.current = true;
      onReady?.();
    }
  }, [isLoading, onReady]);

  if (isLoading) {
    return <PrintSkeleton />;
  }

  if (tenant.error || detail.error || !tenant.data || !detail.data || !card) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Rapor tidak bisa dimuat</AlertTitle>
          <AlertDescription>Gagal mengambil data rapor untuk dicetak.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const homeroomName = (homerooms.data ?? []).find((h) => h.homeroom_id === card.homeroom_id)?.name;

  const teacherNameByUserId = new Map((teachers.data ?? []).flatMap((teacher) => teacher.user_id ? [[teacher.user_id, teacher.full_name] as const] : []));
  const teacherByTeacherId = new Map((teachers.data ?? []).map((t) => [t.teacher_id, t]));

  const homeroomTeacherName = (() => {
    const approval = detail.data.approvals.find((a) => a.role === "homeroom_teacher");
    if (approval) return teacherNameByUserId.get(approval.approver_id) ?? null;
    const sorted = [...(assignments.data ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const oldest = sorted[0];
    if (oldest) return teacherByTeacherId.get(oldest.teacher_id)?.full_name ?? null;
    return null;
  })();

  const subjectById = new Map((subjects.data ?? []).map((s) => [s.subject_id, s]));

  const kelompokGroups = groupScoresByKelompok(
    detail.data.subject_scores ?? [],
    subjectById,
    detail.data.report_card.summary.subjects,
  );

  const schoolName = tenant.data.school_name.toUpperCase() === "DEMO PREMIUM" ? "TPQ BAITUR ROCHMAN" : tenant.data.school_name.toUpperCase();

  return (
    <div className="relative box-border h-[285mm] w-full overflow-hidden border-[3px] border-[#c8a84e] bg-white px-[30px] pb-[20px] pt-[20px] font-serif text-[#20231f] shadow-lg print:h-[285mm] print:shadow-none">
      <div className="pointer-events-none absolute -inset-x-[3px] top-0 z-0 h-[161px]">
        <Image src="/report-card-assets/header.png?v=3" alt="" fill sizes="800px" className="object-fill object-top" priority unoptimized />
      </div>
      <div className="pointer-events-none absolute -inset-x-[3px] bottom-0 z-0 h-[309px]">
        <Image src="/report-card-assets/footer.png?v=3" alt="" fill sizes="800px" className="object-fill object-bottom" priority unoptimized />
      </div>

      <div className="relative z-10 flex items-center justify-center gap-5 text-center">
        <div className="relative h-[72px] w-[72px]">
          {schoolLogo?.file_url ? (
            <Image src={schoolLogo.file_url} alt="Logo sekolah" fill sizes="72px" className="object-contain" />
          ) : (
            <SchoolSeal />
          )}
        </div>
        <div>
          <h1 className="m-0 font-serif text-[28px] font-black leading-tight tracking-[0.04em] text-[#0d4b31]">{schoolName}</h1>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-[#252525]">Jl. Kupang Krajan Kidul 1 No. 56, Surabaya</p>
          <p className="text-[11px] font-medium leading-snug text-[#252525]">Telp : 082234688818 / 0851355980733</p>
        </div>
      </div>

      <div className="relative z-10 my-2 flex justify-center">
        <TitleRibbon />
      </div>

      <div className="relative z-10 mb-3 text-[13px] font-semibold text-[#1d271f]">
        Wali Kelas ( Ustadzah ) : <span className="ml-2 inline-block min-w-[230px] border-b border-dotted border-[#1d271f] px-2 font-bold">{homeroomTeacherName ?? ""}</span>
      </div>

      <div className="relative z-10 grid grid-cols-[1.58fr_1fr] gap-6">
        <div className="space-y-3">
          {kelompokGroups.map((group) => (
            <div key={group.key} className="break-inside-avoid">
              <SectionBadge>{group.label}</SectionBadge>
              <table className="w-full border-collapse bg-white text-[11px] shadow-sm">
                <thead>
                  <tr className="bg-[#0d4b31] text-[#fff8e7]">
                    <th className="border border-[#d7bd73] border-2 px-3 py-1 text-center font-serif font-extrabold uppercase tracking-wide">{group.label}</th>
                    <th className="w-[22%] border border-[#d7bd73] border-2 px-3 py-1 text-center font-serif font-extrabold uppercase tracking-wide">Angka</th>
                    <th className="w-[34%] border border-[#d7bd73] border-2 px-3 py-1 text-center font-serif font-extrabold uppercase tracking-wide">Huruf</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={`${row.score.report_card_id}-${row.score.subject_id}`}>
                      <td className="h-[27px] border border-[#dfc98c] border-2 px-3 py-1 font-sans text-[11px] font-medium text-[#20231f]">{row.name}</td>
                      <td className="border border-[#dfc98c] border-2 px-3 py-1 text-center font-sans text-[11px] font-bold text-[#20231f]">{row.score.final_score}</td>
                      <td className="border border-[#dfc98c] border-2 px-3 py-1 text-center font-sans text-[11px] font-semibold text-[#0d4b31]">{scoreToIndonesianWords(row.score.final_score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 pt-6">
          <div className="relative h-[164px] w-[128px] border-[3px] border-[#c8a84e] bg-[#f1f1ee] p-[5px] shadow-[0_0_0_1px_#0d4b31]">
            <div className="relative h-full w-full overflow-hidden bg-[#efefec]">
              {studentPhoto?.file_url ? (
                <Image src={studentPhoto.file_url} alt="Foto siswa" fill sizes="128px" className="object-cover" />
              ) : (
                <svg viewBox="0 0 118 154" className="h-full w-full">
                  <rect width="118" height="154" fill="#eeeeec" />
                  <circle cx="59" cy="50" r="23" fill="#d8d8d8" />
                  <path d="M22 145c5-36 21-57 37-57s32 21 37 57z" fill="#d4d4d2" />
                  <path d="M35 78c8 9 40 9 48 0v15c-9 11-39 11-48 0z" fill="#d9d9d7" />
                </svg>
              )}
            </div>
          </div>

          <div className="w-full space-y-2 font-sans text-[11px] font-semibold text-[#0d4b31]">
            {[
              ["NAMA", student?.full_name ?? "-"],
              // ["NIK", student?.nik ?? "-"],
              ["KELAS", homeroomName ?? "-"],
              ["ALAMAT", student?.address_line ?? "-"],
              ["NISN", student?.nis ?? "-"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-0.5 uppercase tracking-wide">{label}</div>
                <div className="min-h-[16px] border-b border-dotted border-[#1d271f] pb-0.5 font-medium text-[#252525]">{value}</div>
              </div>
            ))}
          </div>

          <QualificationBox />
        </div>
      </div>

      <div className="relative z-10 mt-7 break-inside-avoid pb-[134px]">
        <div className="mb-5 text-center font-serif text-[11px] font-semibold text-[#1d271f]">Surabaya, <span className="inline-block min-w-[145px] border-b border-dotted border-[#1d271f]" /> 20<span className="inline-block min-w-[36px] border-b border-dotted border-[#1d271f]" /></div>
        <div className="grid grid-cols-3 gap-6">
          <SignatureLine title="Ketua Yayasan" />
          <SignatureLine title="Ketua TPQ Baitur Rochman" />
          <SignatureLine title="Wali Santri" />
        </div>
      </div>
    </div>
  );
}

function PrintSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="h-[297mm] max-h-[80vh] w-full" />
    </div>
  );
}
