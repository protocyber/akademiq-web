export type AcademicSubjectsSort =
  | "name"
  | "-name"
  | "code"
  | "-code"
  | "passing_grade"
  | "-passing_grade";

export type AcademicSubjectsParams = {
  academic_year_id?: string;
  curriculum_version_id?: string;
  search?: string;
  page: number;
  page_size: number;
  sort: AcademicSubjectsSort;
};

export const DEFAULT_ACADEMIC_SUBJECTS_PARAMS: AcademicSubjectsParams = {
  page: 1,
  page_size: 25,
  sort: "name",
};

const sortValues = new Set<AcademicSubjectsSort>([
  "name",
  "-name",
  "code",
  "-code",
  "passing_grade",
  "-passing_grade",
]);

export function parseAcademicSubjectsParams(searchParams: URLSearchParams): AcademicSubjectsParams {
  const page = numberParam(searchParams.get("page"), DEFAULT_ACADEMIC_SUBJECTS_PARAMS.page);
  const pageSize = numberParam(
    searchParams.get("page_size"),
    DEFAULT_ACADEMIC_SUBJECTS_PARAMS.page_size,
  );
  const sort = searchParams.get("sort");

  return {
    academic_year_id: textParam(searchParams.get("academic_year_id")),
    curriculum_version_id: textParam(searchParams.get("curriculum_version_id")),
    search: textParam(searchParams.get("search")),
    page,
    page_size: Math.min(Math.max(pageSize, 1), 100),
    sort:
      sort && sortValues.has(sort as AcademicSubjectsSort)
        ? (sort as AcademicSubjectsSort)
        : DEFAULT_ACADEMIC_SUBJECTS_PARAMS.sort,
  };
}

export function serializeAcademicSubjectsParams(params: AcademicSubjectsParams) {
  const searchParams = new URLSearchParams();
  if (params.academic_year_id) searchParams.set("academic_year_id", params.academic_year_id);
  if (params.curriculum_version_id)
    searchParams.set("curriculum_version_id", params.curriculum_version_id);
  if (params.search) searchParams.set("search", params.search);
  if (params.page !== DEFAULT_ACADEMIC_SUBJECTS_PARAMS.page)
    searchParams.set("page", String(params.page));
  if (params.page_size !== DEFAULT_ACADEMIC_SUBJECTS_PARAMS.page_size)
    searchParams.set("page_size", String(params.page_size));
  if (params.sort !== DEFAULT_ACADEMIC_SUBJECTS_PARAMS.sort) searchParams.set("sort", params.sort);
  return searchParams.toString();
}

export function academicSubjectsParamsKey(params: AcademicSubjectsParams) {
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
