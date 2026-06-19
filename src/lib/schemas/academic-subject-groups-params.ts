export type AcademicSubjectGroupsSort =
  | "name"
  | "-name"
  | "position"
  | "-position"
  | "created_at"
  | "-created_at";

export type AcademicSubjectGroupsParams = {
  academic_year_id?: string;
  curriculum_version_id?: string;
  search?: string;
  page: number;
  page_size: number;
  sort: AcademicSubjectGroupsSort;
};

export const DEFAULT_ACADEMIC_SUBJECT_GROUPS_PARAMS: AcademicSubjectGroupsParams = {
  page: 1,
  page_size: 25,
  sort: "position",
};

const sortValues = new Set<AcademicSubjectGroupsSort>([
  "name",
  "-name",
  "position",
  "-position",
  "created_at",
  "-created_at",
]);

export function parseAcademicSubjectGroupsParams(
  searchParams: URLSearchParams,
): AcademicSubjectGroupsParams {
  const page = numberParam(
    searchParams.get("page"),
    DEFAULT_ACADEMIC_SUBJECT_GROUPS_PARAMS.page,
  );
  const pageSize = numberParam(
    searchParams.get("page_size"),
    DEFAULT_ACADEMIC_SUBJECT_GROUPS_PARAMS.page_size,
  );
  const sort = searchParams.get("sort");

  return {
    academic_year_id: textParam(searchParams.get("academic_year_id")),
    curriculum_version_id: textParam(searchParams.get("curriculum_version_id")),
    search: textParam(searchParams.get("search")),
    page,
    page_size: Math.min(Math.max(pageSize, 1), 100),
    sort:
      sort && sortValues.has(sort as AcademicSubjectGroupsSort)
        ? (sort as AcademicSubjectGroupsSort)
        : DEFAULT_ACADEMIC_SUBJECT_GROUPS_PARAMS.sort,
  };
}

export function serializeAcademicSubjectGroupsParams(params: AcademicSubjectGroupsParams) {
  const searchParams = new URLSearchParams();
  if (params.academic_year_id) searchParams.set("academic_year_id", params.academic_year_id);
  if (params.curriculum_version_id)
    searchParams.set("curriculum_version_id", params.curriculum_version_id);
  if (params.search) searchParams.set("search", params.search);
  if (params.page !== DEFAULT_ACADEMIC_SUBJECT_GROUPS_PARAMS.page)
    searchParams.set("page", String(params.page));
  if (params.page_size !== DEFAULT_ACADEMIC_SUBJECT_GROUPS_PARAMS.page_size)
    searchParams.set("page_size", String(params.page_size));
  if (params.sort !== DEFAULT_ACADEMIC_SUBJECT_GROUPS_PARAMS.sort)
    searchParams.set("sort", params.sort);
  return searchParams.toString();
}

export function academicSubjectGroupsParamsKey(params: AcademicSubjectGroupsParams) {
  return [
    params.academic_year_id ?? "",
    params.curriculum_version_id ?? "",
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
