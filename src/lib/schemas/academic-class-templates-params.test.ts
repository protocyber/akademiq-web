import { describe, expect, it } from "vitest";

import {
  DEFAULT_ACADEMIC_CLASS_TEMPLATES_PARAMS,
  parseAcademicClassTemplatesParams,
  serializeAcademicClassTemplatesParams,
  academicClassTemplatesParamsKey,
} from "./academic-class-templates-params";

function roundTrip(params: ReturnType<typeof parseAcademicClassTemplatesParams>) {
  return parseAcademicClassTemplatesParams(
    new URLSearchParams(serializeAcademicClassTemplatesParams(params)),
  );
}

describe("academic-class-templates-params", () => {
  it("returns defaults for empty params", () => {
    expect(parseAcademicClassTemplatesParams(new URLSearchParams())).toEqual(
      DEFAULT_ACADEMIC_CLASS_TEMPLATES_PARAMS,
    );
  });

  it("carries the academic_year_id filter", () => {
    const params = parseAcademicClassTemplatesParams(
      new URLSearchParams("academic_year_id=year-1"),
    );
    expect(params.academic_year_id).toBe("year-1");
  });

  it("clamps page_size and falls back unknown sort", () => {
    const params = parseAcademicClassTemplatesParams(new URLSearchParams("page_size=999&sort=bogus"));
    expect(params.page_size).toBe(100);
    expect(params.sort).toBe(DEFAULT_ACADEMIC_CLASS_TEMPLATES_PARAMS.sort);
  });

  it("round-trips parse/serialize", () => {
    const params = parseAcademicClassTemplatesParams(
      new URLSearchParams("academic_year_id=y1&sort=-grade_level&page=2&page_size=5"),
    );
    expect(roundTrip(params)).toEqual(params);
  });

  it("changes the params key when academic_year_id changes", () => {
    const a = academicClassTemplatesParamsKey({
      academic_year_id: "y1",
      search: undefined,
      page: 1,
      page_size: 25,
      sort: "grade_level",
    });
    const b = academicClassTemplatesParamsKey({
      academic_year_id: "y2",
      search: undefined,
      page: 1,
      page_size: 25,
      sort: "grade_level",
    });
    expect(a).not.toEqual(b);
  });
});
