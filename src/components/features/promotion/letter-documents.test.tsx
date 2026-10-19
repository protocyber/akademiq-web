/** @vitest-environment jsdom */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CertificateDocument } from "@/components/features/promotion/certificate-document";
import { ClassLetterDocument, classLetterResultText } from "@/components/features/promotion/class-letter-document";
import type { Certificate, ClassLetterPrint, Letterhead } from "@/lib/query/queries/use-promotion-letters";

const letterhead = {
  school_name: "SMP Negeri 1 (nama terkini)",
  npsn: "20531234",
  address_line: "Jl. Pemuda 1",
  city_regency: "Surabaya",
  province: "Jawa Timur",
  logo_url: null,
} as unknown as Letterhead;

const data: ClassLetterPrint = {
  letterhead,
  source_year_name: "2025/2026",
  target_year_name: "2026/2027",
  homeroom_id: "h",
  homeroom_name: "VII-A",
  letter: {
    homeroom_id: "h",
    letter_number: "421/001/SK/2026",
    letter_date: "2026-06-20",
    city: "Surabaya",
    school_name: "SMP Negeri 1",
    principal_name: "Dra. Siti Rahayu",
    principal_nip: null,
    issued_by: "u",
    issued_at: "2026-06-20T01:00:00Z",
    updated_by: "u",
    updated_at: "2026-06-20T01:00:00Z",
  },
  students: [
    { student_id: "1", full_name: "Ani", nis: "001", nisn: "0091", result: "promote", target_homeroom_name: "VIII-A" },
    { student_id: "2", full_name: "Budi", nis: "002", nisn: null, result: "retain", target_homeroom_name: "VII-B" },
  ],
};

describe("classLetterResultText", () => {
  it("words each result", () => {
    expect(classLetterResultText(data.students[0])).toBe("Naik ke kelas VIII-A");
    expect(classLetterResultText(data.students[1])).toBe("Tinggal di kelas VII-B");
    expect(classLetterResultText({ ...data.students[0], result: "graduate", target_homeroom_name: null })).toBe("Lulus");
  });
});

describe("ClassLetterDocument", () => {
  it("renders the snapshot, the year and the students, without an empty NIP line", () => {
    render(<ClassLetterDocument data={data} />);
    expect(screen.getByText("Nomor: 421/001/SK/2026")).toBeTruthy();
    expect(screen.getByText(/Kenaikan Kelas Tahun Ajaran 2025\/2026/)).toBeTruthy();
    expect(screen.getByText("Dra. Siti Rahayu")).toBeTruthy();
    expect(screen.getAllByText("SMP Negeri 1").length).toBeGreaterThan(0);
    expect(screen.queryByText("SMP Negeri 1 (nama terkini)")).toBeNull();
    expect(screen.getByText("Naik ke kelas VIII-A")).toBeTruthy();
    expect(screen.getByText(/Surabaya, 20 Juni 2026/)).toBeTruthy();
    expect(screen.queryByText(/NIP\./)).toBeNull();
  });
});

describe("CertificateDocument", () => {
  it("renders the graduate's identity and the principal with NIP", () => {
    const certificate: Certificate = {
      student_id: "1",
      full_name: "Ani Lulus",
      nis: "001",
      nisn: "0091234567",
      birth_place: "Sidoarjo",
      birth_date: "2009-03-04",
      last_homeroom_name: "IX-A",
      graduation_date: "2026-06-15",
      certificate_number: "421.3/001/SKL/2026",
      letter_date: "2026-06-22",
      city: "Surabaya",
      school_name: "SMP Negeri 1",
      principal_name: "Dra. Siti Rahayu",
      principal_nip: "196805121993032004",
      issued_at: "2026-06-22T01:00:00Z",
      updated_at: "2026-06-22T01:00:00Z",
    };
    render(<CertificateDocument certificate={certificate} letterhead={letterhead} sourceYearName="2025/2026" />);
    expect(screen.getByText("SURAT KETERANGAN LULUS")).toBeTruthy();
    expect(screen.getByText("Nomor: 421.3/001/SKL/2026")).toBeTruthy();
    expect(screen.getByText("Ani Lulus")).toBeTruthy();
    expect(screen.getByText("Sidoarjo, 4 Maret 2009")).toBeTruthy();
    expect(screen.getByText(/pada Tahun Ajaran 2025\/2026/)).toBeTruthy();
    expect(screen.getByText("NIP. 196805121993032004")).toBeTruthy();
  });
});
