import { describe, expect, it } from "vitest";

import {
  DEFAULT_ACADEMIC_SUBJECTS_PARAMS,
  parseAcademicSubjectsParams,
  serializeAcademicSubjectsParams,
  academicSubjectsParamsKey,
} from "./academic-subjects-params";

function roundTrip(params: ReturnType<typeof parseAcademicSubjectsParams>) {
  return parseAcademicSubjectsParams(new URLSearchParams(serializeAcademicSubjectsParams(params)));
}

describe("academic-subjects-params", () => {
  it("returns defaults for empty params", () => {
    expect(parseAcademicSubjectsParams(new URLSearchParams())).toEqual(
      DEFAULT_ACADEMIC_SUBJECTS_PARAMS,
    );
  });

  it("carries the filter ids (academic_year_id, curriculum_version_id)", () => {
    const params = parseAcademicSubjectsParams(
      new URLSearchParams("academic_year_id=abc&curriculum_version_id=def"),
    );
    expect(params.academic_year_id).toBe("abc");
    expect(params.curriculum_version_id).toBe("def");
  });

  it("clamps page_size to 100 and falls back unknown sort", () => {
    const params = parseAcademicSubjectsParams(new URLSearchParams("page_size=999&sort=bogus"));
    expect(params.page_size).toBe(100);
    expect(params.sort).toBe(DEFAULT_ACADEMIC_SUBJECTS_PARAMS.sort);
  });

  it("round-trips parse/serialize including filter ids", () => {
    const params = parseAcademicSubjectsParams(
      new URLSearchParams(
        "academic_year_id=y1&curriculum_version_id=v1&search=mat&sort=code&page=2&page_size=10",
      ),
    );
    expect(roundTrip(params)).toEqual(params);
  });
});
