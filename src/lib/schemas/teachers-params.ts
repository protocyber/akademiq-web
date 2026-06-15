export type TeachersSort = "name" | "-name" | "nip" | "-nip";

export type TeachersParams = {
  search?: string;
  page: number;
  page_size: number;
  sort: TeachersSort;
};

export const DEFAULT_TEACHERS_PARAMS: TeachersParams = {
  page: 1,
  page_size: 25,
  sort: "name",
};

const sortValues = new Set<TeachersSort>(["name", "-name", "nip", "-nip"]);

export function parseTeachersParams(searchParams: URLSearchParams): TeachersParams {
  const page = numberParam(searchParams.get("page"), DEFAULT_TEACHERS_PARAMS.page);
  const pageSize = numberParam(
    searchParams.get("page_size"),
    DEFAULT_TEACHERS_PARAMS.page_size,
  );
  const sort = searchParams.get("sort");

  return {
    search: textParam(searchParams.get("search")),
    page,
    page_size: Math.min(Math.max(pageSize, 1), 100),
    sort:
      sort && sortValues.has(sort as TeachersSort)
        ? (sort as TeachersSort)
        : DEFAULT_TEACHERS_PARAMS.sort,
  };
}

export function serializeTeachersParams(params: TeachersParams) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.page !== DEFAULT_TEACHERS_PARAMS.page)
    searchParams.set("page", String(params.page));
  if (params.page_size !== DEFAULT_TEACHERS_PARAMS.page_size)
    searchParams.set("page_size", String(params.page_size));
  if (params.sort !== DEFAULT_TEACHERS_PARAMS.sort) searchParams.set("sort", params.sort);
  return searchParams.toString();
}

export function teachersParamsKey(params: TeachersParams) {
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
