export type TeachingAssignmentsSort =
  | "created"
  | "-created"
  | "teacher"
  | "-teacher"
  | "homeroom"
  | "-homeroom";

export type TeachingAssignmentsParams = {
  search?: string;
  academic_year_id?: string;
  homeroom_id?: string;
  page: number;
  page_size: number;
  sort: TeachingAssignmentsSort;
};

export const DEFAULT_TEACHING_ASSIGNMENTS_PARAMS: TeachingAssignmentsParams = {
  page: 1,
  page_size: 25,
  sort: "created",
};

const sortValues = new Set<TeachingAssignmentsSort>([
  "created",
  "-created",
  "teacher",
  "-teacher",
  "homeroom",
  "-homeroom",
]);

export function parseTeachingAssignmentsParams(
  searchParams: URLSearchParams,
): TeachingAssignmentsParams {
  const page = numberParam(
    searchParams.get("page"),
    DEFAULT_TEACHING_ASSIGNMENTS_PARAMS.page,
  );
  const pageSize = numberParam(
    searchParams.get("page_size"),
    DEFAULT_TEACHING_ASSIGNMENTS_PARAMS.page_size,
  );
  const sort = searchParams.get("sort");

  return {
    search: textParam(searchParams.get("search")),
    academic_year_id: textParam(searchParams.get("academic_year_id")),
    homeroom_id: textParam(searchParams.get("homeroom_id")),
    page,
    page_size: Math.min(Math.max(pageSize, 1), 100),
    sort:
      sort && sortValues.has(sort as TeachingAssignmentsSort)
        ? (sort as TeachingAssignmentsSort)
        : DEFAULT_TEACHING_ASSIGNMENTS_PARAMS.sort,
  };
}

export function serializeTeachingAssignmentsParams(params: TeachingAssignmentsParams) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.academic_year_id)
    searchParams.set("academic_year_id", params.academic_year_id);
  if (params.homeroom_id) searchParams.set("homeroom_id", params.homeroom_id);
  if (params.page !== DEFAULT_TEACHING_ASSIGNMENTS_PARAMS.page)
    searchParams.set("page", String(params.page));
  if (params.page_size !== DEFAULT_TEACHING_ASSIGNMENTS_PARAMS.page_size)
    searchParams.set("page_size", String(params.page_size));
  if (params.sort !== DEFAULT_TEACHING_ASSIGNMENTS_PARAMS.sort)
    searchParams.set("sort", params.sort);
  return searchParams.toString();
}

export function teachingAssignmentsParamsKey(params: TeachingAssignmentsParams) {
  return [
    params.search ?? "",
    params.academic_year_id ?? "",
    params.homeroom_id ?? "",
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
