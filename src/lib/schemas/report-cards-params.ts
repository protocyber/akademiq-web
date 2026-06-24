export type ReportCardsParams = {
  report_type_id?: string;
  homeroom_id?: string;
};

export const DEFAULT_REPORT_CARDS_PARAMS: ReportCardsParams = {};

export function parseReportCardsParams(searchParams: URLSearchParams): ReportCardsParams {
  return {
    report_type_id: textParam(searchParams.get("report_type_id")),
    homeroom_id: textParam(searchParams.get("homeroom_id")),
  };
}

export function serializeReportCardsParams(params: ReportCardsParams) {
  const searchParams = new URLSearchParams();
  if (params.report_type_id) searchParams.set("report_type_id", params.report_type_id);
  if (params.homeroom_id) searchParams.set("homeroom_id", params.homeroom_id);
  return searchParams.toString();
}

export function reportCardsParamsKey(params: ReportCardsParams) {
  return [params.report_type_id ?? "", params.homeroom_id ?? ""] as const;
}

function textParam(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
