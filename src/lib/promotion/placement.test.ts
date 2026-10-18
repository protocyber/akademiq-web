import { describe, expect, it } from "vitest";

import type { Homeroom } from "@/lib/query/queries/use-academic-ops";
import type { PromotionDecision } from "@/lib/query/queries/use-promotion";
import {
  EMPTY_DRAFT,
  applyClassDefault,
  draftChanges,
  effectiveTarget,
  eligibleHomerooms,
  expectedOrdinal,
  groupBySourceHomeroom,
  mapAssignmentErrors,
  setStudentTarget,
  withStudentNames,
} from "@/lib/promotion/placement";

const TARGET_YEAR = "year-t";
const D1 = "11111111-1111-4111-8111-111111111111";
const D2 = "22222222-2222-4222-8222-222222222222";
const D3 = "33333333-3333-4333-8333-333333333333";

function homeroom(id: string, name: string, ordinal: number | null, year = TARGET_YEAR): Homeroom {
  return {
    homeroom_id: id,
    name,
    grade_level: "x",
    grade_level_id: ordinal === null ? null : `gl-${ordinal}`,
    ordinal,
    capacity: 30,
    academic_year_id: year,
    enrolled_count: 0,
    homeroom_teacher_id: null,
  };
}

function decision(partial: Partial<PromotionDecision> & { decision_id: string }): PromotionDecision {
  return {
    student_id: `s-${partial.decision_id}`,
    homeroom_id: "src-a",
    recommended: "promote",
    result: "promote",
    overridden: false,
    reason: null,
    computed_metrics: {
      subjects_counted: 1,
      subjects_below_kkm: 0,
      average: 80,
      kkm_used: 75,
      criteria: { min_average: null, max_subjects_below_kkm: null, min_attendance_percent: null },
    },
    target_homeroom_id: null,
    target_enrollment_id: null,
    full_name: "Siswa",
    nis: "1",
    homeroom_name: "X-1",
    source_ordinal: 1,
    ...partial,
  };
}

describe("expectedOrdinal", () => {
  it("is source + 1 to promote, the same to retain, none to graduate", () => {
    expect(expectedOrdinal("promote", 1)).toBe(2);
    expect(expectedOrdinal("retain", 1)).toBe(1);
    expect(expectedOrdinal("graduate", 3)).toBeNull();
    expect(expectedOrdinal("promote", null)).toBeNull();
  });
});

describe("eligibleHomerooms", () => {
  const rooms = [
    homeroom("t-xi-b", "XI-B", 2),
    homeroom("t-xi-a", "XI-A", 2),
    homeroom("t-x-a", "X-A", 1),
    homeroom("t-none", "Unlinked", null),
    homeroom("old-xi", "XI-Old", 2, "year-s"),
  ];

  it("keeps target-year homerooms with the expected ordinal, sorted by name", () => {
    const ids = eligibleHomerooms({ result: "promote", source_ordinal: 1 }, rooms, TARGET_YEAR).map((h) => h.homeroom_id);
    expect(ids).toEqual(["t-xi-a", "t-xi-b"]);
    expect(eligibleHomerooms({ result: "retain", source_ordinal: 1 }, rooms, TARGET_YEAR).map((h) => h.homeroom_id)).toEqual([
      "t-x-a",
    ]);
  });

  it("offers nothing when the source ordinal is unknown or the student graduates", () => {
    expect(eligibleHomerooms({ result: "promote", source_ordinal: null }, rooms, TARGET_YEAR)).toEqual([]);
    expect(eligibleHomerooms({ result: "graduate", source_ordinal: 3 }, rooms, TARGET_YEAR)).toEqual([]);
  });
});

describe("draft", () => {
  const decisions = [
    decision({ decision_id: D1, result: "promote" }),
    decision({ decision_id: D2, result: "promote", target_homeroom_id: "t-xi-b" }),
    decision({ decision_id: D3, result: "retain" }),
  ];

  it("applyClassDefault fills students of that result and skips corrected decisions", () => {
    let draft = setStudentTarget(EMPTY_DRAFT, D2, "t-xi-c");
    draft = applyClassDefault(draft, decisions, "src-a", "promote", "t-xi-a");
    expect(effectiveTarget(decisions[0], draft)).toBe("t-xi-a");
    expect(effectiveTarget(decisions[1], draft)).toBe("t-xi-c");
    expect(effectiveTarget(decisions[2], draft)).toBeNull();
  });

  it("applyClassDefault only touches the given source homeroom", () => {
    const other = decision({ decision_id: "d-other", homeroom_id: "src-b" });
    const draft = applyClassDefault(EMPTY_DRAFT, [...decisions, other], "src-a", "promote", "t-xi-a");
    expect(effectiveTarget(other, draft)).toBeNull();
  });

  it("draftChanges sends only values that differ from the server, null clears", () => {
    let draft = setStudentTarget(EMPTY_DRAFT, D1, "t-xi-a");
    draft = setStudentTarget(draft, D2, "t-xi-b"); // same as server
    draft = setStudentTarget(draft, D3, null); // same as server (null)
    expect(draftChanges(draft, decisions)).toEqual([{ decision_id: D1, homeroom_id: "t-xi-a" }]);
    const cleared = setStudentTarget(EMPTY_DRAFT, D2, null);
    expect(draftChanges(cleared, decisions)).toEqual([{ decision_id: D2, homeroom_id: null }]);
  });
});

describe("mapAssignmentErrors", () => {
  it("puts each decision message on its row and keeps the rest", () => {
    const result = mapAssignmentErrors(
      [
        `decision ${D1}: homeroom XI-A is ordinal 2, expected 1`,
        `decision ${D2}: assigned more than once`,
        `decision ${D3}: not in this run`,
        "at most 2000 assignments per request",
      ],
      new Set([D1, D2]),
    );
    expect(result.byDecision).toEqual({
      [D1]: ["homeroom XI-A is ordinal 2, expected 1"],
      [D2]: ["assigned more than once"],
    });
    expect(result.unmatched).toEqual([
      `decision ${D3}: not in this run`,
      "at most 2000 assignments per request",
    ]);
  });
});

describe("withStudentNames", () => {
  it("replaces known student ids and leaves unknown ones", () => {
    const names = new Map([[D1, "Ani"]]);
    expect(withStudentNames(`student ${D1} has no target homeroom`, names)).toBe("Ani has no target homeroom");
    expect(withStudentNames(`student ${D1}'s enrollment is no longer active`, names)).toBe(
      "Ani's enrollment is no longer active",
    );
    expect(withStudentNames(`student ${D2} has no target homeroom`, names)).toBe(`student ${D2} has no target homeroom`);
  });
});

describe("groupBySourceHomeroom", () => {
  it("orders by ordinal (unknown last), then name; students by name then NIS", () => {
    const groups = groupBySourceHomeroom([
      decision({ decision_id: "a", homeroom_id: "h2", homeroom_name: "XI-A", source_ordinal: 2, full_name: "Budi", nis: "2" }),
      decision({ decision_id: "b", homeroom_id: "h1", homeroom_name: "X-B", source_ordinal: 1, full_name: "Ani", nis: "1" }),
      decision({ decision_id: "c", homeroom_id: "h0", homeroom_name: "Lama", source_ordinal: null, full_name: "Cici", nis: "3" }),
      decision({ decision_id: "d", homeroom_id: "h1b", homeroom_name: "X-A", source_ordinal: 1, full_name: "Dodi", nis: "4" }),
      decision({ decision_id: "e", homeroom_id: "h1", homeroom_name: "X-B", source_ordinal: 1, full_name: "Ani", nis: "0" }),
    ]);
    expect(groups.map((g) => g.homeroom_name)).toEqual(["X-A", "X-B", "XI-A", "Lama"]);
    expect(groups[1].decisions.map((d) => d.decision_id)).toEqual(["e", "b"]);
  });
});
