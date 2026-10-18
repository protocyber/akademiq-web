import { describe, expect, it } from "vitest";

import {
  criteriaFormSchema,
  criteriaToForm,
  overrideSchema,
  targetYearSchema,
  toCriteriaPayload,
} from "@/lib/schemas/promotion";

describe("criteriaFormSchema", () => {
  it("accepts blanks and in-range numbers", () => {
    expect(criteriaFormSchema.safeParse({ min_average: "", max_subjects_below_kkm: "" }).success).toBe(true);
    expect(criteriaFormSchema.safeParse({ min_average: "70.5", max_subjects_below_kkm: "2" }).success).toBe(true);
  });

  it("rejects out-of-range and non-integer values", () => {
    const result = criteriaFormSchema.safeParse({ min_average: "101", max_subjects_below_kkm: "1.5" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.min_average?.[0]).toBe("Isi 0–100 atau kosongkan");
      expect(fields.max_subjects_below_kkm?.[0]).toBe("Isi bilangan bulat 0 atau lebih, atau kosongkan");
    }
  });

  it("converts to the API payload and back", () => {
    expect(toCriteriaPayload({ min_average: " 70 ", max_subjects_below_kkm: "" })).toEqual({
      min_average: 70,
      max_subjects_below_kkm: null,
      min_attendance_percent: null,
    });
    expect(criteriaToForm({ min_average: null, max_subjects_below_kkm: 2, min_attendance_percent: null })).toEqual({
      min_average: "",
      max_subjects_below_kkm: "2",
    });
  });
});

describe("overrideSchema", () => {
  it("needs a 10-character reason when the result differs from the recommendation", () => {
    const schema = overrideSchema("promote");
    const short = schema.safeParse({ result: "retain", reason: "  terlalu " });
    expect(short.success).toBe(false);
    if (!short.success) {
      expect(short.error.flatten().fieldErrors.reason?.[0]).toBe("Alasan minimal 10 karakter");
    }
    expect(schema.safeParse({ result: "retain", reason: "Sering tidak hadir semester 2" }).success).toBe(true);
  });

  it("needs no reason when the result goes back to the recommendation", () => {
    expect(overrideSchema("promote").safeParse({ result: "promote", reason: "" }).success).toBe(true);
  });
});

describe("targetYearSchema", () => {
  it("requires a year", () => {
    expect(targetYearSchema.safeParse({ target_academic_year_id: "" }).success).toBe(false);
    expect(
      targetYearSchema.safeParse({ target_academic_year_id: "11111111-1111-4111-8111-111111111111" }).success,
    ).toBe(true);
  });
});
