export type AcademicYearsSort =
  | "name"
  | "-name"
  | "start_date"
  | "-start_date"
  | "status"
  | "-status";

export type AcademicYearsParams = {
  search?: string;
  page: number;
  page_size: number;
  sort: AcademicYearsSort;
};

export const DEFAULT_ACADEMIC_YEARS_PARAMS: AcademicYearsParams = {
  page: 1,
  page_size: 25,
  sort: "name",
};

const sortValues = new Set<AcademicYearsSort>([
  "name",
  "-name",
  "start_date",
  "-start_date",
  "status",
  "-status",
]);

export function parseAcademicYearsParams(searchParams: URLSearchParams): AcademicYearsParams {
  const page = numberParam(searchParams.get("page"), DEFAULT_ACADEMIC_YEARS_PARAMS.page);
  const pageSize = numberParam(
    searchParams.get("page_size"),
    DEFAULT_ACADEMIC_YEARS_PARAMS.page_size,
  );
  const sort = searchParams.get("sort");

  return {
    search: textParam(searchParams.get("search")),
    page,
    page_size: Math.min(Math.max(pageSize, 1), 100),
    sort:
      sort && sortValues.has(sort as AcademicYearsSort)
        ? (sort as AcademicYearsSort)
        : DEFAULT_ACADEMIC_YEARS_PARAMS.sort,
  };
}

export function serializeAcademicYearsParams(params: AcademicYearsParams) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.page !== DEFAULT_ACADEMIC_YEARS_PARAMS.page)
    searchParams.set("page", String(params.page));
  if (params.page_size !== DEFAULT_ACADEMIC_YEARS_PARAMS.page_size)
    searchParams.set("page_size", String(params.page_size));
  if (params.sort !== DEFAULT_ACADEMIC_YEARS_PARAMS.sort) searchParams.set("sort", params.sort);
  return searchParams.toString();
}

export function academicYearsParamsKey(params: AcademicYearsParams) {
  return [params.search ?? "", params.page, params.page_size, params.sort] as const;
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
