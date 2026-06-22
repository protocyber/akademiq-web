"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AuthGuard } from "@/components/features/auth-guard";
import { groupScoresByKelompok } from "@/components/features/grading/report-card-detail-body";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useSubjectsForYear } from "@/lib/query/queries/use-academic-config";
import { useReportCardDetail } from "@/lib/query/queries/use-grading";
import { useHomeroomRoster, useTeachers, useHomerooms, useTeachingAssignments } from "@/lib/query/queries/use-academic-ops";

// Number to Indonesian words (terbilang) helper for grade score
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
  const tenant = useTenantMe();
  const detail = useReportCardDetail(params.reportTypeId);
  const card = detail.data?.report_card;
  const roster = useHomeroomRoster(card?.homeroom_id);
  const teachers = useTeachers();
  const homerooms = useHomerooms();
  const subjects = useSubjectsForYear(card?.academic_year_id);
  const assignments = useTeachingAssignments(card?.homeroom_id);

  // Auto trigger print when page finishes loading
  React.useEffect(() => {
    const isLoaded = !tenant.isLoading && !detail.isLoading && !roster.isLoading && !teachers.isLoading && !homerooms.isLoading && !subjects.isLoading && !assignments.isLoading;
    const isSuccess = !tenant.error && !detail.error && tenant.data && detail.data && card;

    if (isLoaded && isSuccess) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tenant.isLoading, detail.isLoading, roster.isLoading, teachers.isLoading, homerooms.isLoading, subjects.isLoading, assignments.isLoading, tenant.error, detail.error, tenant.data, detail.data, card]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.opener) {
      window.close();
    } else {
      router.push(`/grading/report-cards`);
    }
  };

  if (tenant.isLoading || detail.isLoading || roster.isLoading || teachers.isLoading || homerooms.isLoading || subjects.isLoading || assignments.isLoading) {
    return <PageSkeleton />;
  }

  if (tenant.error || detail.error || !tenant.data || !detail.data || !card) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Rapor tidak bisa dimuat</AlertTitle>
          <AlertDescription>Gagal mengambil data rapor untuk dicetak.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const student = (roster.data ?? []).find((s) => s.student_id === card.student_id);
  const homeroomName = (homerooms.data ?? []).find((h) => h.homeroom_id === card.homeroom_id)?.name;
  
  const teacherNameByUserId = new Map((teachers.data ?? []).flatMap((teacher) => teacher.user_id ? [[teacher.user_id, teacher.full_name] as const] : []));
  const teacherByTeacherId = new Map((teachers.data ?? []).map((t) => [t.teacher_id, t]));

  // Find homeroom teacher — primary from approvals, fallback to oldest teaching assignment
  const homeroomTeacherName = (() => {
    const approval = detail.data.approvals.find((a) => a.role === "homeroom_teacher");
    if (approval) return teacherNameByUserId.get(approval.approver_id) ?? null;
    const sorted = [...(assignments.data ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const oldest = sorted[0];
    if (oldest) return teacherByTeacherId.get(oldest.teacher_id)?.full_name ?? null;
    return null;
  })();

  // Build subject lookup from year's curriculum (carries kelompok metadata).
  const subjectById = new Map((subjects.data ?? []).map((s) => [s.subject_id, s]));

  // Group frozen subject scores by kelompok, ordered by group position then
  // subject name. Subjects whose group cannot be resolved are NOT dropped.
  const kelompokGroups = groupScoresByKelompok(
    detail.data.subject_scores ?? [],
    subjectById,
    detail.data.report_card.summary.subjects,
  );

  return (
    <div className="min-h-screen bg-white text-black font-sans p-6 sm:p-12 md:max-w-[210mm] mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Action Toolbar - Hidden during print */}
      <div className="mb-6 flex items-center border-b pb-4 print:hidden">
        <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
      </div>

      {/* Printable Report Wrapper */}
      <div className="border border-black p-5 relative overflow-hidden print:border-none print:p-0">
        
        {/* Style injection for background printing and page defaults */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background-color: white;
              color: black;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
          @page {
            size: A4;
            margin: 15mm 12mm 15mm 12mm;
          }
        `}} />

        {/* 1. Header Banner */}
        <div className="bg-[#00c853] text-white flex items-center justify-between border border-black p-4 relative" style={{ backgroundColor: "#00c853" }}>
          {/* Logo SVG (TKQ-TPQ Baitur Rochman) */}
          <div className="w-[100px] h-[100px] bg-white rounded-full border-2 border-yellow-400 p-0.5 flex-shrink-0 flex items-center justify-center shadow-md select-none print:shadow-none">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="48" fill="#00c853" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#fcd34d" strokeWidth="2" strokeDasharray="4 2" />
              {/* Outer Text Path */}
              <path id="textPathTop" d="M 18,50 A 32,32 0 1,1 82,50" fill="none" />
              <text fontFamily="Arial" fontSize="7" fontWeight="bold" fill="white" letterSpacing="0.5">
                <textPath href="#textPathTop" startOffset="50%" textAnchor="middle">
                  TKQ-TPQ BAITUR ROCHMAN
                </textPath>
              </text>
              <path id="textPathBottom" d="M 82,50 A 32,32 0 0,1 18,50" fill="none" />
              <text fontFamily="Arial" fontSize="6" fontWeight="bold" fill="white" letterSpacing="0.2">
                <textPath href="#textPathBottom" startOffset="50%" textAnchor="middle">
                  KUPANG KRAJAN KIDUL I/56
                </textPath>
              </text>
              {/* Center Book & Stars */}
              <g transform="translate(50, 48)">
                {/* 5 Stars */}
                <path d="M -16,-10 L -15,-7 L -12,-7 L -14,-5 L -13,-2 L -16,-4 L -19,-2 L -18,-5 L -20,-7 L -17,-7 Z" fill="#fcd34d" transform="scale(0.6)" />
                <path d="M -8,-14 L -7,-11 L -4,-11 L -6,-9 L -5,-6 L -8,-8 L -11,-6 L -10,-9 L -12,-11 L -9,-11 Z" fill="#fcd34d" transform="scale(0.6)" />
                <path d="M 0,-16 L 1,-13 L 4,-13 L 2,-11 L 3,-8 L 0,-10 L -3,-8 L -2,-11 L -4,-13 L -1,-13 Z" fill="#fcd34d" transform="scale(0.6)" />
                <path d="M 8,-14 L 9,-11 L 12,-11 L 10,-9 L 11,-6 L 8,-8 L 5,-6 L 6,-9 L 4,-11 L 7,-11 Z" fill="#fcd34d" transform="scale(0.6)" />
                <path d="M 16,-10 L 17,-7 L 20,-7 L 18,-5 L 19,-2 L 16,-4 L 13,-2 L 14,-5 L 12,-7 L 15,-7 Z" fill="#fcd34d" transform="scale(0.6)" />
                
                {/* Quran Stand */}
                <path d="M -15,12 L 15,12 L 10,2 L -10,2 Z" fill="#b45309" />
                <path d="M -8,12 L 8,12 L 5,6 L -5,6 Z" fill="#78350f" />
                
                {/* Book Pages */}
                <path d="M -15,0 C -5,-2 0,2 0,2 C 0,2 5,-2 15,0 L 12,-6 C 2,-8 0,-4 0,-4 C 0,-4 -2,-8 -12,-6 Z" fill="white" stroke="#00c853" strokeWidth="0.5" />
                <path d="M -15,0 C -5,-2 0,2 0,2 L 0,-4 C 0,-4 -5,-8 -15,-6 Z" fill="#fafafa" />
                {/* Text lines on pages */}
                <line x1="-10" y1="-3" x2="-4" y2="-4" stroke="#d1d5db" strokeWidth="0.5" />
                <line x1="-10" y1="-1" x2="-4" y2="-2" stroke="#d1d5db" strokeWidth="0.5" />
                <line x1="4" y1="-4" x2="10" y2="-3" stroke="#d1d5db" strokeWidth="0.5" />
                <line x1="4" y1="-2" x2="10" y2="-1" stroke="#d1d5db" strokeWidth="0.5" />
                
                {/* Little Dome Circle frame */}
                <path d="M -18,6 A 19,19 0 0,1 18,6" fill="none" stroke="white" strokeWidth="1.5" />
              </g>
              {/* Banner Ribbon at bottom */}
              <path d="M 22,74 L 78,74 L 72,82 L 28,82 Z" fill="#fcd34d" />
              <text x="50" y="80" fontFamily="Arial" fontSize="5.5" fontWeight="bold" fill="#00c853" textAnchor="middle">
                SURABAYA
              </text>
            </svg>
          </div>

          {/* Banner Text */}
          <div className="flex-1 text-center select-none">
            <h2 className="text-3xl font-extrabold tracking-wide font-sans m-0 leading-tight">
              {tenant.data.school_name.toUpperCase() === "DEMO PREMIUM" ? "TPQ BAITUR ROCHMAN" : tenant.data.school_name.toUpperCase()}
            </h2>
            <p className="text-sm font-semibold tracking-widest mt-1 mb-0 opacity-95">
              JL. KUPANG KRAJAN KIDUL 1 NO. 56
            </p>
            <p className="text-sm font-semibold tracking-wider mt-0.5 mb-0 opacity-95">
              TELP : 082234688818 / 085135980733
            </p>
          </div>
          
          <div className="w-[100px] h-[100px] flex-shrink-0 print:hidden opacity-0" />
        </div>

        {/* 2. Orange Capsule Sub-header */}
        <div className="my-6 flex justify-center">
          <div className="bg-[#f47820] text-white py-2 px-8 rounded-full border border-black text-center font-bold tracking-widest text-sm shadow-sm select-none" style={{ backgroundColor: "#f47820" }}>
            RAPOR PRESTASI SANTRI SUMATIF GANJIL - GENAP
          </div>
        </div>

        {/* 3. Main Split Section */}
        <div className="grid grid-cols-[1.5fr_1fr] gap-8 mt-4">
          
          {/* Left Column: Tables */}
          <div className="flex flex-col gap-5">
            {/* Wali Kelas (Top of tables) */}
            <div className="text-sm font-medium select-none">
              Wali Kelas ( Ustadzah ) : <span className="font-semibold underline pl-1">{homeroomTeacherName ?? "___________________"}</span>
            </div>

            {/* One table per kelompok, ordered by position then subject name */}
            {kelompokGroups.map((group) => (
              <div key={group.key} className="border border-black overflow-hidden shadow-sm">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#76c345] text-white border-b border-black" style={{ backgroundColor: "#76c345" }}>
                      <th className="p-2 text-left border-r border-black font-extrabold uppercase w-[48%] tracking-wider">{group.label}</th>
                      <th className="p-2 text-center border-r border-black font-extrabold uppercase w-[17%] tracking-wider">ANGKA</th>
                      <th className="p-2 text-center font-extrabold uppercase w-[35%] tracking-wider">HURUF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={`${row.score.report_card_id}-${row.score.subject_id}`} className="border-b border-black last:border-b-0 hover:bg-muted/10 transition-colors">
                        <td className="p-2 border-r border-black font-semibold text-gray-800">{row.name}</td>
                        <td className="p-2 border-r border-black text-center font-bold">{row.score.final_score}</td>
                        <td className="p-2 text-center text-gray-600 italic font-medium">{scoreToIndonesianWords(row.score.final_score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Right Column: Photo, Student Info & Scale */}
          <div className="flex flex-col items-end gap-6">
            {/* Custom SVG Photo frame (Aesthetic mountain/sun placeholder) */}
            <div className="w-[130px] h-[173px] border-2 border-black bg-gray-50 flex items-center justify-center relative overflow-hidden shadow-inner select-none">
              <svg viewBox="0 0 130 173" className="w-full h-full">
                {/* Sky */}
                <rect x="0" y="0" width="130" height="173" fill="#e0f2fe" />
                <circle cx="100" cy="40" r="14" fill="#fef08a" />
                {/* Clouds */}
                <circle cx="35" cy="65" r="15" fill="white" opacity="0.9" />
                <circle cx="55" cy="65" r="20" fill="white" opacity="0.9" />
                <circle cx="75" cy="68" r="14" fill="white" opacity="0.9" />
                {/* Mountain/Hills */}
                <path d="M -20,173 L 40,110 L 90,145 L 160,95 L 160,173 Z" fill="#84cc16" />
                <path d="M -10,173 L 70,125 L 150,173 Z" fill="#65a30d" opacity="0.85" />
                <path d="M 20,173 L 110,135 L 160,173 Z" fill="#4d7c0f" opacity="0.75" />
                {/* Frame border inner shadow */}
                <rect x="0" y="0" width="130" height="173" fill="none" stroke="black" strokeWidth="2" />
                {/* Centered label */}
                <rect x="25" y="75" width="80" height="24" rx="4" fill="black" fillOpacity="0.45" />
                <text x="65" y="90" fontFamily="Arial" fontSize="9" fontWeight="bold" fill="white" textAnchor="middle" letterSpacing="1">
                  FOTO 3 X 4
                </text>
              </svg>
            </div>

            {/* Student Info Lines */}
            <div className="w-full space-y-3 font-medium text-xs">
              <div className="flex flex-col border-b border-black pb-1">
                <span className="text-[10px] uppercase text-gray-500 font-extrabold select-none">NAMA</span>
                <span className="font-bold text-sm text-gray-900 pr-2">{student?.full_name ?? "-"}</span>
              </div>
              <div className="flex flex-col border-b border-black pb-1">
                <span className="text-[10px] uppercase text-gray-500 font-extrabold select-none">NIK</span>
                <span className="font-bold text-gray-900 pr-2">{student?.nik ?? "-"}</span>
              </div>
              <div className="flex flex-col border-b border-black pb-1">
                <span className="text-[10px] uppercase text-gray-500 font-extrabold select-none">Kelas</span>
                <span className="font-bold text-gray-900 pr-2">{homeroomName ?? "-"}</span>
              </div>
              <div className="flex flex-col border-b border-black pb-1">
                <span className="text-[10px] uppercase text-gray-500 font-extrabold select-none">Alamat</span>
                <span className="font-bold text-gray-900 pr-2">{student?.address_line ?? "-"}</span>
              </div>
              <div className="flex flex-col border-b border-black pb-1">
                <span className="text-[10px] uppercase text-gray-500 font-extrabold select-none">Nisn</span>
                <span className="font-bold text-gray-900 pr-2">{student?.nis ?? "-"}</span>
              </div>
            </div>

            {/* Kualifikasi Nilai Table Box */}
            <div className="w-full border border-black p-3 bg-white mt-2 select-none shadow-sm">
              <h4 className="text-center font-extrabold text-[11px] tracking-widest border-b border-black pb-1.5 mb-2 uppercase">
                KUALIFIKASI NILAI
              </h4>
              <ul className="space-y-1.5 text-[11px] font-semibold text-gray-700">
                <li className="flex justify-between">
                  <span>A = 90 - 100</span>
                  <span className="text-emerald-700">( Amat Baik )</span>
                </li>
                <li className="flex justify-between">
                  <span>B = 80 - 89</span>
                  <span className="text-blue-700">( Baik )</span>
                </li>
                <li className="flex justify-between">
                  <span>C = 60 - 79</span>
                  <span className="text-amber-700">( Cukup )</span>
                </li>
                <li className="flex justify-between">
                  <span>D = 50 - 78</span>
                  <span className="text-red-700">( Remidi )</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 4. Bottom Signatures */}
        <div className="mt-14 select-none">
          {/* Surabaya, Date line */}
          <div className="text-center text-xs font-bold mb-6">
            Surabaya, &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Juni 2026
          </div>

          {/* Three signature columns */}
          <div className="grid grid-cols-3 text-center text-xs font-bold gap-4">
            
            {/* Left column */}
            <div className="flex flex-col justify-between h-[110px]">
              <div>Ketua Yayasan</div>
              <div className="underline decoration-1 underline-offset-4 font-extrabold text-sm">
                Moch Fitrah Muttaqin
              </div>
            </div>

            {/* Center column */}
            <div className="flex flex-col justify-between h-[110px]">
              <div>Ketua Tpq Baitur Rochman</div>
              <div className="underline decoration-1 underline-offset-4 font-extrabold text-sm">
                Silvi Hariroh
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col justify-between h-[110px]">
              <div>Wali Santri</div>
              <div className="underline decoration-1 underline-offset-4">
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        {/* Animated loading spinner */}
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <h3 className="font-bold text-lg text-gray-800">Menyiapkan Dokumen Rapor</h3>
          <p className="text-sm text-gray-500 mt-1">Mohon tunggu sebentar, data sedang dimuat...</p>
        </div>
      </div>
    </main>
  );
}
