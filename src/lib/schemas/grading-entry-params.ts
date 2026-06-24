export type GradingEntryParams = {
  homeroom_id?: string;
  subject_id?: string;
};

export const DEFAULT_GRADING_ENTRY_PARAMS: GradingEntryParams = {};

export function parseGradingEntryParams(searchParams: URLSearchParams): GradingEntryParams {
  return {
    homeroom_id: textParam(searchParams.get("homeroom_id")),
    subject_id: textParam(searchParams.get("subject_id")),
  };
}

export function serializeGradingEntryParams(params: GradingEntryParams) {
  const searchParams = new URLSearchParams();
  if (params.homeroom_id) searchParams.set("homeroom_id", params.homeroom_id);
  if (params.subject_id) searchParams.set("subject_id", params.subject_id);
  return searchParams.toString();
}

export function gradingEntryParamsKey(params: GradingEntryParams) {
  return [params.homeroom_id ?? "", params.subject_id ?? ""] as const;
}

function textParam(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
