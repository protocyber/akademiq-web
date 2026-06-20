import { describe, expect, it } from "vitest";

import {
  resolveDefaultAcademicYear,
  resolveDefaultTerm,
  resolveDefaultCurriculum,
} from "./scope-resolvers";

describe("resolveDefaultAcademicYear", () => {
  it("returns null for empty list", () => {
    expect(resolveDefaultAcademicYear([])).toBeNull();
  });

  it("prefers active year over newer start_date", () => {
    const years = [
      { academic_year_id: "y1", status: "Inactive", start_date: "2025-01-01", end_date: "2025-12-31" },
      { academic_year_id: "y2", status: "Active", start_date: "2024-01-01", end_date: "2024-12-31" },
    ];
    expect(resolveDefaultAcademicYear(years)).toBe("y2");
  });

  it("falls back to newest start_date when no active year", () => {
    const years = [
      { academic_year_id: "y1", status: "Inactive", start_date: "2024-01-01", end_date: "2024-12-31" },
      { academic_year_id: "y2", status: "Inactive", start_date: "2025-01-01", end_date: "2025-12-31" },
    ];
    expect(resolveDefaultAcademicYear(years)).toBe("y2");
  });

  it("returns the only year regardless of status", () => {
    const years = [
      { academic_year_id: "y1", status: "Draft", start_date: "2025-01-01", end_date: "2025-12-31" },
    ];
    expect(resolveDefaultAcademicYear(years)).toBe("y1");
  });
});

describe("resolveDefaultTerm", () => {
  it("returns null for empty list", () => {
    expect(resolveDefaultTerm([])).toBeNull();
  });

  it("prefers active term over others", () => {
    const terms = [
      { term_id: "t1", status: "Inactive", start_date: "2025-01-01", end_date: "2025-06-30" },
      { term_id: "t2", status: "Active", start_date: "2024-07-01", end_date: "2024-12-31" },
    ];
    expect(resolveDefaultTerm(terms)).toBe("t2");
  });

  it("picks in-range term when no active term", () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const past = new Date(today.getTime() - 86400000 * 10).toISOString().slice(0, 10);
    const future = new Date(today.getTime() + 86400000 * 10).toISOString().slice(0, 10);

    const terms = [
      { term_id: "t1", status: "Inactive", start_date: past, end_date: past },
      { term_id: "t2", status: "Inactive", start_date: past, end_date: future },
    ];
    expect(resolveDefaultTerm(terms)).toBe("t2");
  });

  it("falls back to newest start_date when no active or in-range term", () => {
    const terms = [
      { term_id: "t1", status: "Inactive", start_date: "2024-01-01", end_date: "2024-06-30" },
      { term_id: "t2", status: "Inactive", start_date: "2025-01-01", end_date: "2025-06-30" },
    ];
    expect(resolveDefaultTerm(terms)).toBe("t2");
  });
});

describe("resolveDefaultCurriculum", () => {
  it("returns null for empty list", () => {
    expect(resolveDefaultCurriculum([])).toBeNull();
  });

  it("returns the last curriculum in array", () => {
    const curriculums = [
      { curriculum_version_id: "c1" },
      { curriculum_version_id: "c2" },
    ];
    expect(resolveDefaultCurriculum(curriculums)).toBe("c2");
  });

  it("returns the only curriculum", () => {
    const curriculums = [
      { curriculum_version_id: "c1" },
    ];
    expect(resolveDefaultCurriculum(curriculums)).toBe("c1");
  });
});
