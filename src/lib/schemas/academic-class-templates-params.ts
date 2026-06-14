export type AcademicClassTemplatesSort =
  | "grade_level"
  | "-grade_level"
  | "default_capacity"
  | "-default_capacity";

export type AcademicClassTemplatesParams = {
  academic_year_id?: string;
  search?: string;
  page: number;
  page_size: number;
  sort: AcademicClassTemplatesSort;
};

export const DEFAULT_ACADEMIC_CLASS_TEMPLATES_PARAMS: AcademicClassTemplatesParams = {
  page: 1,
  page_size: 25,
  sort: "grade_level",
};

const sortValues = new Set<AcademicClassTemplatesSort>([
  "grade_level",
  "-grade_level",
  "default_capacity",
  "-default_capacity",
]);

export function parseAcademicClassTemplatesParams(
  searchParams: URLSearchParams,
): AcademicClassTemplatesParams {
  const page = numberParam(searchParams.get("page"), DEFAULT_ACADEMIC_CLASS_TEMPLATES_PARAMS.page);
  const pageSize = numberParam(
    searchParams.get("page_size"),
    DEFAULT_ACADEMIC_CLASS_TEMPLATES_PARAMS.page_size,
  );
  const sort = searchParams.get("sort");

  return {
    academic_year_id: textParam(searchParams.get("academic_year_id")),
    search: textParam(searchParams.get("search")),
    page,
    page_size: Math.min(Math.max(pageSize, 1), 100),
    sort:
      sort && sortValues.has(sort as AcademicClassTemplatesSort)
        ? (sort as AcademicClassTemplatesSort)
        : DEFAULT_ACADEMIC_CLASS_TEMPLATES_PARAMS.sort,
  };
}

export function serializeAcademicClassTemplatesParams(params: AcademicClassTemplatesParams) {
  const searchParams = new URLSearchParams();
  if (params.academic_year_id) searchParams.set("academic_year_id", params.academic_year_id);
  if (params.search) searchParams.set("search", params.search);
  if (params.page !== DEFAULT_ACADEMIC_CLASS_TEMPLATES_PARAMS.page)
    searchParams.set("page", String(params.page));
  if (params.page_size !== DEFAULT_ACADEMIC_CLASS_TEMPLATES_PARAMS.page_size)
    searchParams.set("page_size", String(params.page_size));
  if (params.sort !== DEFAULT_ACADEMIC_CLASS_TEMPLATES_PARAMS.sort)
    searchParams.set("sort", params.sort);
  return searchParams.toString();
}

export function academicClassTemplatesParamsKey(params: AcademicClassTemplatesParams) {
  return [
    params.academic_year_id ?? "",
    params.search ?? "",
    params.page,
    params.page_size,
    params.sort,
  ] as const;
}

function numberParam(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function textParam(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
