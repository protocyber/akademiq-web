import { describe, expect, it } from "vitest";

import {
  DEFAULT_GRADING_ENTRY_PARAMS,
  parseGradingEntryParams,
  serializeGradingEntryParams,
} from "./grading-entry-params";
import {
  DEFAULT_REPORT_CARDS_PARAMS,
  parseReportCardsParams,
  serializeReportCardsParams,
} from "./report-cards-params";

function roundTripGradingEntry(params: ReturnType<typeof parseGradingEntryParams>) {
  return parseGradingEntryParams(new URLSearchParams(serializeGradingEntryParams(params)));
}

function roundTripReportCards(params: ReturnType<typeof parseReportCardsParams>) {
  return parseReportCardsParams(new URLSearchParams(serializeReportCardsParams(params)));
}

describe("grading-entry-params", () => {
  it("returns defaults for empty params", () => {
    expect(parseGradingEntryParams(new URLSearchParams())).toEqual(
      DEFAULT_GRADING_ENTRY_PARAMS,
    );
  });

  it("omits empty fields when serializing", () => {
    expect(serializeGradingEntryParams({ homeroom_id: "h1" })).toBe("homeroom_id=h1");
    expect(serializeGradingEntryParams({ subject_id: "s1" })).toBe("subject_id=s1");
  });

  it("round-trips homeroom and subject ids", () => {
    const params = parseGradingEntryParams(
      new URLSearchParams("homeroom_id=h1&subject_id=s1"),
    );
    expect(roundTripGradingEntry(params)).toEqual(params);
  });
});

describe("report-cards-params", () => {
  it("returns defaults for empty params", () => {
    expect(parseReportCardsParams(new URLSearchParams())).toEqual(
      DEFAULT_REPORT_CARDS_PARAMS,
    );
  });

  it("omits empty fields when serializing", () => {
    expect(serializeReportCardsParams({ report_type_id: "r1" })).toBe("report_type_id=r1");
    expect(serializeReportCardsParams({ homeroom_id: "h1" })).toBe("homeroom_id=h1");
  });

  it("round-trips report type and homeroom ids", () => {
    const params = parseReportCardsParams(
      new URLSearchParams("report_type_id=r1&homeroom_id=h1"),
    );
    expect(roundTripReportCards(params)).toEqual(params);
  });
});
