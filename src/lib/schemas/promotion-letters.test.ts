import { describe, expect, it } from "vitest";

import { classLetterSchema, numberPatternSchema, toCityPayload } from "@/lib/schemas/promotion-letters";

describe("classLetterSchema", () => {
  it("needs a number and a date; city may be blank", () => {
    expect(classLetterSchema.safeParse({ letter_number: "421/001", letter_date: "2026-06-20", city: "" }).success).toBe(true);
    const r = classLetterSchema.safeParse({ letter_number: "  ", letter_date: "", city: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = r.error.flatten().fieldErrors;
      expect(f.letter_number?.[0]).toBe("Nomor SK wajib diisi");
      expect(f.letter_date?.[0]).toBe("Tanggal surat wajib diisi");
    }
  });

  it("caps the number at 64 characters", () => {
    const r = classLetterSchema.safeParse({ letter_number: "x".repeat(65), letter_date: "2026-06-20", city: "" });
    expect(r.success).toBe(false);
  });
});

describe("numberPatternSchema", () => {
  const ok = { pattern: "421.3/{n}/SKL/2026", start: "1", digits: "3", letter_date: "2026-06-22", city: "", overwrite: false };

  it("accepts a pattern with {n}", () => {
    expect(numberPatternSchema.safeParse(ok).success).toBe(true);
  });

  it("requires {n}, a positive start and 1–6 digits", () => {
    const r = numberPatternSchema.safeParse({ ...ok, pattern: "421.3/SKL", start: "0", digits: "9" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = r.error.flatten().fieldErrors;
      expect(f.pattern?.[0]).toBe("Pola harus memuat {n}");
      expect(f.start?.[0]).toBe("Isi bilangan bulat 1 atau lebih");
      expect(f.digits?.[0]).toBe("Isi 1 sampai 6");
    }
  });
});

describe("toCityPayload", () => {
  it("sends null for a blank city so the server uses the profile's city", () => {
    expect(toCityPayload("  ")).toBeNull();
    expect(toCityPayload(" Sidoarjo ")).toBe("Sidoarjo");
  });
});
