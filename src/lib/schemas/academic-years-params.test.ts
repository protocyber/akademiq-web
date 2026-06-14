import { describe, expect, it } from "vitest";

import {
  DEFAULT_ACADEMIC_YEARS_PARAMS,
  parseAcademicYearsParams,
  serializeAcademicYearsParams,
  academicYearsParamsKey,
} from "./academic-years-params";

function roundTrip(params: ReturnType<typeof parseAcademicYearsParams>) {
  return parseAcademicYearsParams(new URLSearchParams(serializeAcademicYearsParams(params)));
}

describe("academic-years-params", () => {
  it("returns defaults for empty params", () => {
    expect(parseAcademicYearsParams(new URLSearchParams())).toEqual(DEFAULT_ACADEMIC_YEARS_PARAMS);
  });

  it("clamps page_size to 100", () => {
    const params = parseAcademicYearsParams(new URLSearchParams("page_size=999"));
    expect(params.page_size).toBe(100);
  });

  it("preserves non-default search, sort, page, page_size", () => {
    const params = parseAcademicYearsParams(
      new URLSearchParams("search=2026&sort=-name&page=2&page_size=10"),
    );
    expect(params).toEqual({ search: "2026", page: 2, page_size: 10, sort: "-name" });
  });

  it("falls back to default sort for unknown sort values", () => {
    const params = parseAcademicYearsParams(new URLSearchParams("sort=bogus"));
    expect(params.sort).toBe(DEFAULT_ACADEMIC_YEARS_PARAMS.sort);
  });

  it("round-trips parse/serialize", () => {
    const params = parseAcademicYearsParams(
      new URLSearchParams("search=2024&sort=start_date&page=3&page_size=50"),
    );
    expect(roundTrip(params)).toEqual(params);
  });

  it("changes the params key when params change", () => {
    const a = academicYearsParamsKey({ search: undefined, page: 1, page_size: 25, sort: "name" });
    const b = academicYearsParamsKey({ search: "x", page: 1, page_size: 25, sort: "name" });
    expect(a).not.toEqual(b);
  });
});
