import { describe, expect, it } from "vitest";

import {
  curriculumVersionSchema,
  subjectGroupSchema,
  subjectSchema,
} from "@/lib/schemas/subject";

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";

describe("curriculumVersionSchema", () => {
  it("accepts a name with optional description", () => {
    const parsed = curriculumVersionSchema.safeParse({ name: "Kurikulum Merdeka" });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const parsed = curriculumVersionSchema.safeParse({ name: "" });
    expect(parsed.success).toBe(false);
  });
});

describe("subjectSchema", () => {
  it("accepts a valid subject with subject_group_id", () => {
    const parsed = subjectSchema.safeParse({
      curriculum_version_id: UUID_A,
      subject_group_id: UUID_B,
      name: "Matematika",
      code: "MTK",
      passing_grade: 75,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing subject_group_id", () => {
    const parsed = subjectSchema.safeParse({
      curriculum_version_id: UUID_A,
      name: "Matematika",
      passing_grade: 75,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty subject_group_id", () => {
    const parsed = subjectSchema.safeParse({
      curriculum_version_id: UUID_A,
      subject_group_id: "",
      name: "Matematika",
      passing_grade: 75,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a passing_grade above 100", () => {
    const parsed = subjectSchema.safeParse({
      curriculum_version_id: UUID_A,
      subject_group_id: UUID_B,
      name: "Matematika",
      passing_grade: 101,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("subjectGroupSchema", () => {
  it("accepts a name, optional code, and position", () => {
    const parsed = subjectGroupSchema.safeParse({
      name: "Kelompok A",
      code: "A",
      position: 2,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a group without a code", () => {
    const parsed = subjectGroupSchema.safeParse({ name: "Umum", position: 1 });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const parsed = subjectGroupSchema.safeParse({ name: "", position: 1 });
    expect(parsed.success).toBe(false);
  });

  it("rejects a position below 1", () => {
    const parsed = subjectGroupSchema.safeParse({ name: "Kelompok A", position: 0 });
    expect(parsed.success).toBe(false);
  });
});
