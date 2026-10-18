import type { Homeroom } from "@/lib/query/queries/use-academic-ops";
import type { PromotionDecision, PromotionResult } from "@/lib/query/queries/use-promotion";

/** Grade levels match across years by ordinal (Plan 3c spec §2.8). */
export function expectedOrdinal(result: PromotionResult, sourceOrdinal: number | null): number | null {
  if (sourceOrdinal === null || result === "graduate") return null;
  return result === "promote" ? sourceOrdinal + 1 : sourceOrdinal;
}

export function eligibleHomerooms(
  decision: Pick<PromotionDecision, "result" | "source_ordinal">,
  homerooms: Homeroom[],
  targetYearId: string,
): Homeroom[] {
  const ordinal = expectedOrdinal(decision.result, decision.source_ordinal);
  if (ordinal === null) return [];
  return homerooms
    .filter((h) => h.academic_year_id === targetYearId && h.ordinal === ordinal)
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

/** Unsaved targets. `corrected` = decisions the admin set one by one. */
export type PlacementDraft = {
  values: Record<string, string | null>;
  corrected: ReadonlySet<string>;
};

export const EMPTY_DRAFT: PlacementDraft = { values: {}, corrected: new Set() };

export function effectiveTarget(
  decision: Pick<PromotionDecision, "decision_id" | "target_homeroom_id">,
  draft: PlacementDraft,
): string | null {
  return decision.decision_id in draft.values
    ? draft.values[decision.decision_id]
    : decision.target_homeroom_id;
}

export function setStudentTarget(draft: PlacementDraft, decisionId: string, homeroomId: string | null): PlacementDraft {
  const corrected = new Set(draft.corrected);
  corrected.add(decisionId);
  return { values: { ...draft.values, [decisionId]: homeroomId }, corrected };
}

export function applyClassDefault(
  draft: PlacementDraft,
  decisions: PromotionDecision[],
  sourceHomeroomId: string,
  result: "promote" | "retain",
  homeroomId: string,
): PlacementDraft {
  const values = { ...draft.values };
  for (const d of decisions) {
    if (d.homeroom_id !== sourceHomeroomId || d.result !== result) continue;
    if (draft.corrected.has(d.decision_id)) continue;
    values[d.decision_id] = homeroomId;
  }
  return { values, corrected: draft.corrected };
}

export function draftChanges(
  draft: PlacementDraft,
  decisions: PromotionDecision[],
): { decision_id: string; homeroom_id: string | null }[] {
  const changes: { decision_id: string; homeroom_id: string | null }[] = [];
  for (const d of decisions) {
    if (!(d.decision_id in draft.values)) continue;
    const value = draft.values[d.decision_id];
    if (value !== d.target_homeroom_id) changes.push({ decision_id: d.decision_id, homeroom_id: value });
  }
  return changes;
}

const DECISION_PREFIX = /^decision ([0-9a-f-]{36}): (.*)$/i;

export function mapAssignmentErrors(
  messages: string[],
  knownIds: ReadonlySet<string>,
): { byDecision: Record<string, string[]>; unmatched: string[] } {
  const byDecision: Record<string, string[]> = {};
  const unmatched: string[] = [];
  for (const message of messages) {
    const match = DECISION_PREFIX.exec(message);
    if (match && knownIds.has(match[1])) {
      (byDecision[match[1]] ??= []).push(match[2]);
    } else {
      unmatched.push(message);
    }
  }
  return { byDecision, unmatched };
}

const STUDENT_ID = /student ([0-9a-f-]{36})/gi;

/** Replaces `student <id>` with the student's name when known. */
export function withStudentNames(message: string, names: ReadonlyMap<string, string>): string {
  return message.replace(STUDENT_ID, (whole, id: string) => names.get(id) ?? whole);
}

export function groupBySourceHomeroom(decisions: PromotionDecision[]): {
  homeroom_id: string;
  homeroom_name: string;
  source_ordinal: number | null;
  decisions: PromotionDecision[];
}[] {
  const groups = new Map<string, { homeroom_id: string; homeroom_name: string; source_ordinal: number | null; decisions: PromotionDecision[] }>();
  for (const d of decisions) {
    const group = groups.get(d.homeroom_id) ?? {
      homeroom_id: d.homeroom_id,
      homeroom_name: d.homeroom_name ?? "—",
      source_ordinal: d.source_ordinal,
      decisions: [],
    };
    group.decisions.push(d);
    groups.set(d.homeroom_id, group);
  }
  const byStudent = (a: PromotionDecision, b: PromotionDecision) =>
    (a.full_name ?? "").localeCompare(b.full_name ?? "", "id") || (a.nis ?? "").localeCompare(b.nis ?? "", "id");
  return [...groups.values()]
    .map((g) => ({ ...g, decisions: [...g.decisions].sort(byStudent) }))
    .sort((a, b) => {
      const ao = a.source_ordinal ?? Number.POSITIVE_INFINITY;
      const bo = b.source_ordinal ?? Number.POSITIVE_INFINITY;
      return ao - bo || a.homeroom_name.localeCompare(b.homeroom_name, "id");
    });
}
