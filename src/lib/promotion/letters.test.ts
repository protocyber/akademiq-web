import { describe, expect, it } from "vitest";

import type { Certificate } from "@/lib/query/queries/use-promotion-letters";
import {
  buildCertificateNumbers,
  certificateChanges,
  duplicateNumbers,
  effectiveNumber,
  formatLetterDate,
  formatNumber,
  mapStudentErrors,
  orderGraduates,
} from "@/lib/promotion/letters";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function cert(student_id: string, full_name: string, homeroom: string, certificate_number: string | null = null): Certificate {
  return {
    student_id,
    full_name,
    nis: null,
    nisn: null,
    birth_place: null,
    birth_date: null,
    last_homeroom_name: homeroom,
    graduation_date: "2026-06-15",
    certificate_number,
    letter_date: null,
    city: null,
    school_name: null,
    principal_name: null,
    principal_nip: null,
    issued_at: null,
    updated_at: null,
  };
}

const rows = [cert(C, "Citra", "IX-B"), cert(A, "Budi", "IX-A"), cert(B, "Ani", "IX-A")];
const opts = { pattern: "421.3/{n}/SKL/2026", start: 1, digits: 3, overwrite: false };

describe("formatNumber", () => {
  it("pads and replaces every {n}", () => {
    expect(formatNumber("421.3/{n}/SKL", 7, 3)).toBe("421.3/007/SKL");
    expect(formatNumber("{n}-{n}", 12, 1)).toBe("12-12");
  });
});

describe("orderGraduates", () => {
  it("orders by class then name", () => {
    expect(orderGraduates(rows).map((r) => r.full_name)).toEqual(["Ani", "Budi", "Citra"]);
  });
});

describe("buildCertificateNumbers", () => {
  it("numbers graduates in class-then-name order", () => {
    expect(buildCertificateNumbers(rows, {}, opts)).toEqual({
      [B]: "421.3/001/SKL/2026",
      [A]: "421.3/002/SKL/2026",
      [C]: "421.3/003/SKL/2026",
    });
  });

  it("keeps typed numbers unless overwrite", () => {
    const typed = { [A]: "MANUAL-9" };
    const filled = buildCertificateNumbers(rows, typed, opts);
    expect(filled[A]).toBe("MANUAL-9");
    expect(filled[B]).toBe("421.3/001/SKL/2026");
    expect(filled[C]).toBe("421.3/002/SKL/2026");

    const overwritten = buildCertificateNumbers(rows, typed, { ...opts, overwrite: true });
    expect(overwritten[A]).toBe("421.3/002/SKL/2026");
  });

  it("keeps saved numbers unless overwrite", () => {
    const saved = [cert(B, "Ani", "IX-A", "OLD-1"), cert(A, "Budi", "IX-A")];
    const filled = buildCertificateNumbers(saved, {}, { ...opts, start: 5 });
    expect(filled[B]).toBeUndefined();
    expect(filled[A]).toBe("421.3/005/SKL/2026");
  });
});

describe("duplicateNumbers", () => {
  it("flags rows sharing a non-blank number, saved or drafted", () => {
    const saved = [cert(A, "Budi", "IX-A", "X"), cert(B, "Ani", "IX-A"), cert(C, "Citra", "IX-B")];
    expect(duplicateNumbers(saved, { [B]: " X ", [C]: "" })).toEqual(new Set([A, B]));
  });
});

describe("certificateChanges", () => {
  it("sends only drafted rows that differ from the saved number", () => {
    const saved = [cert(A, "Budi", "IX-A", "X"), cert(B, "Ani", "IX-A")];
    expect(certificateChanges(saved, { [A]: " X ", [B]: "Y" })).toEqual([{ student_id: B, certificate_number: "Y" }]);
    expect(effectiveNumber(saved[0], {})).toBe("X");
  });
});

describe("formatLetterDate", () => {
  it("formats a DATE as a local calendar day in Indonesian", () => {
    expect(formatLetterDate("2026-06-20")).toBe("20 Juni 2026");
    expect(formatLetterDate("2009-03-04")).toBe("4 Maret 2009");
    expect(formatLetterDate(null)).toBe("");
  });
});

describe("mapStudentErrors", () => {
  it("maps student lines to rows and keeps the rest", () => {
    const out = mapStudentErrors(
      [`student ${A}: listed more than once`, "must contain between 1 and 2000 items", `student ${C}: not a graduate of this run`],
      new Set([A, B]),
    );
    expect(out.byStudent).toEqual({ [A]: ["listed more than once"] });
    expect(out.unmatched).toEqual(["must contain between 1 and 2000 items", `student ${C}: not a graduate of this run`]);
  });
});
