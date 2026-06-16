import { describe, expect, it } from "vitest";

import {
  reportCardGenerateSchema,
  reportFormulaSchema,
  reportTypeCreateSchema,
} from "@/lib/schemas/grading";

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";

describe("reportCardGenerateSchema", () => {
  it("accepts report_type_id and homeroom_id", () => {
    const parsed = reportCardGenerateSchema.safeParse({ report_type_id: UUID_A, homeroom_id: UUID_B });
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing report_type_id", () => {
    const parsed = reportCardGenerateSchema.safeParse({ homeroom_id: UUID_B });
    expect(parsed.success).toBe(false);
  });
});

describe("reportTypeCreateSchema", () => {
  it("accepts a code+name for a year", () => {
    const parsed = reportTypeCreateSchema.safeParse({
      academic_year_id: UUID_B,
      code: "Rapor UTS",
      name: "Rapor Tengah Semester",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty code", () => {
    const parsed = reportTypeCreateSchema.safeParse({
      academic_year_id: UUID_B,
      code: "",
      name: "Rapor Tengah Semester",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const parsed = reportTypeCreateSchema.safeParse({
      academic_year_id: UUID_B,
      code: "Rapor UTS",
      name: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("reportFormulaSchema", () => {
  it("accepts a weights map keyed by evaluation id", () => {
    const parsed = reportFormulaSchema.safeParse({
      weights: { [UUID_A]: 25, [UUID_B]: 75 },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a weight above 100", () => {
    const parsed = reportFormulaSchema.safeParse({
      weights: { [UUID_A]: 150 },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a negative weight", () => {
    const parsed = reportFormulaSchema.safeParse({
      weights: { [UUID_A]: -5 },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("weight sum validation (exactly 100)", () => {
  // Mirrors the backend's exact-100 rule and the Kelola Evaluasi matrix's valid state.
  const sum = (weights: Record<string, number>) =>
    Object.values(weights).reduce((total, value) => total + value, 0);

  it("treats a sum of exactly 100 as valid", () => {
    expect(Math.abs(sum({ [UUID_A]: 25, [UUID_B]: 75 }) - 100)).toBeLessThan(1e-9);
  });

  it("treats a non-100 sum as invalid", () => {
    expect(Math.abs(sum({ [UUID_A]: 25, [UUID_B]: 70 }) - 100)).toBeGreaterThan(1e-9);
  });
});
