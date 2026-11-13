import type { CopyItem } from "@/lib/query/queries/use-year-copy";

export type { CopyItem };

export const DEFAULT_ITEMS: CopyItem[] = [
  "terms",
  "grade_levels",
  "classes",
  "curriculum",
  "grading_policy",
  "report_types",
  "evaluation_weights",
];

/** Items each copy service owns (classes is reported by both config and ops). */
export const CONFIG_ITEMS: CopyItem[] = ["terms", "grade_levels", "classes", "curriculum", "grading_policy"];
export const OPS_ITEMS: CopyItem[] = ["classes", "homeroom_teachers", "teaching_assignments", "timetable"];
export const GRADING_ITEMS: CopyItem[] = ["report_types", "evaluation_weights"];

export const ITEM_LABELS: Record<CopyItem, string> = {
  terms: "Semester",
  grade_levels: "Tingkat",
  classes: "Kelas",
  homeroom_teachers: "Wali kelas",
  curriculum: "Kurikulum",
  grading_policy: "Kebijakan nilai",
  report_types: "Tipe rapor",
  evaluation_weights: "Template evaluasi + bobot",
  teaching_assignments: "Penugasan guru",
  timetable: "Jadwal pelajaran",
};

/** Display order of the checklist (spec §2). */
const ORDER: CopyItem[] = [
  "terms",
  "grade_levels",
  "classes",
  "homeroom_teachers",
  "curriculum",
  "grading_policy",
  "report_types",
  "evaluation_weights",
  "teaching_assignments",
  "timetable",
];

/** item -> items it depends on (spec §2). */
const DEPENDS_ON: Partial<Record<CopyItem, CopyItem[]>> = {
  classes: ["grade_levels"],
  homeroom_teachers: ["classes"],
  report_types: ["terms"],
  evaluation_weights: ["report_types"],
  teaching_assignments: ["classes", "curriculum"],
  timetable: ["teaching_assignments"],
};

export type ChecklistRow = {
  item: CopyItem;
  checked: boolean;
  disabled: boolean;
  reason?: string;
};

/**
 * A dependent item is disabled (and unchecked) only while a dependency is
 * unchecked AND the target does not already hold that dependency's data.
 * Resolved in display order, so a disabled parent also disables its children.
 */
export function resolveChecklist(
  selected: Set<CopyItem>,
  targetHas: Partial<Record<CopyItem, boolean>>,
): ChecklistRow[] {
  const effective = new Set<CopyItem>();
  const rows: ChecklistRow[] = [];
  for (const item of ORDER) {
    const missing = (DEPENDS_ON[item] ?? []).find(
      (dep) => !effective.has(dep) && !targetHas[dep],
    );
    if (missing) {
      rows.push({
        item,
        checked: false,
        disabled: true,
        reason: `Butuh ${ITEM_LABELS[missing]}`,
      });
      continue;
    }
    const checked = selected.has(item);
    if (checked) effective.add(item);
    rows.push({ item, checked, disabled: false });
  }
  return rows;
}

export type SourceTerm = {
  term_id: string;
  name: string;
  start_date: string;
  end_date: string;
};

export type ShiftedTerm = {
  source_term_id: string;
  name: string;
  start_date: string;
  end_date: string;
};

function parse(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

function shiftMonths(date: string, months: number): string {
  const [y, m, d] = parse(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(d, daysInMonth(ny, nm)); // 29 Feb -> 28 Feb, 31 -> 30
  return `${pad(ny, 4)}-${pad(nm)}-${pad(nd)}`;
}

/**
 * Shifts term dates by the whole-month distance between the two year starts,
 * clamping the day to the month end (mirrors the backend `shift_date`).
 */
export function shiftTermDates(
  sourceYearStart: string,
  targetYearStart: string,
  terms: SourceTerm[],
): ShiftedTerm[] {
  const [sy, sm] = parse(sourceYearStart);
  const [ty, tm] = parse(targetYearStart);
  const months = (ty - sy) * 12 + (tm - sm);
  return terms.map((t) => ({
    source_term_id: t.term_id,
    name: t.name,
    start_date: shiftMonths(t.start_date, months),
    end_date: shiftMonths(t.end_date, months),
  }));
}
