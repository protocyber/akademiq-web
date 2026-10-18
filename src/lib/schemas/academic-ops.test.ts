import { describe, expect, it } from "vitest";

import { homeroomSchema } from "@/lib/schemas/academic-ops";

const YEAR = "11111111-1111-4111-8111-111111111111";
const LEVEL = "22222222-2222-4222-8222-222222222222";

describe("homeroomSchema", () => {
  it("accepts a homeroom linked to a grade level", () => {
    const parsed = homeroomSchema.parse({
      name: "X-1",
      grade_level_id: LEVEL,
      capacity: "32",
      academic_year_id: YEAR,
    });
    expect(parsed).toEqual({ name: "X-1", grade_level_id: LEVEL, capacity: 32, academic_year_id: YEAR });
  });

  it("rejects a homeroom without a grade level", () => {
    const result = homeroomSchema.safeParse({ name: "X-1", grade_level_id: "", capacity: 32, academic_year_id: YEAR });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.grade_level_id?.[0]).toBe("Pilih tingkat kelas");
    }
  });
});
