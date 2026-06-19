export type AcademicTermsSort =
  | "start_date"
  | "-start_date"
  | "name"
  | "-name"
  | "status"
  | "-status";

export type AcademicTermsParams = {
  search?: string;
  page: number;
  page_size: number;
  sort: AcademicTermsSort;
};

export const DEFAULT_ACADEMIC_TERMS_PARAMS: AcademicTermsParams = {
  page: 1,
  page_size: 10,
  sort: "start_date",
};

const sortValues = new Set<AcademicTermsSort>([
  "start_date",
  "-start_date",
  "name",
  "-name",
  "status",
  "-status",
]);

export function parseAcademicTermsParams(searchParams: URLSearchParams): AcademicTermsParams {
  const page = numberParam(searchParams.get("page"), DEFAULT_ACADEMIC_TERMS_PARAMS.page);
  const pageSize = numberParam(
    searchParams.get("page_size"),
    DEFAULT_ACADEMIC_TERMS_PARAMS.page_size,
  );
  const sort = searchParams.get("sort");

  return {
    search: textParam(searchParams.get("search")),
    page,
    page_size: Math.min(Math.max(pageSize, 1), 100),
    sort:
      sort && sortValues.has(sort as AcademicTermsSort)
        ? (sort as AcademicTermsSort)
        : DEFAULT_ACADEMIC_TERMS_PARAMS.sort,
  };
}

export function serializeAcademicTermsParams(params: AcademicTermsParams) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.page !== DEFAULT_ACADEMIC_TERMS_PARAMS.page)
    searchParams.set("page", String(params.page));
  if (params.page_size !== DEFAULT_ACADEMIC_TERMS_PARAMS.page_size)
    searchParams.set("page_size", String(params.page_size));
  if (params.sort !== DEFAULT_ACADEMIC_TERMS_PARAMS.sort) searchParams.set("sort", params.sort);
  return searchParams.toString();
}

export function academicTermsParamsKey(params: AcademicTermsParams) {
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
