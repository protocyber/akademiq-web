import { describe, expect, it } from "vitest";

import { DEFAULT_ITEMS, resolveChecklist, shiftTermDates } from "./checklist";

const find = (rows: ReturnType<typeof resolveChecklist>, item: string) =>
  rows.find((r) => r.item === item)!;

describe("resolveChecklist", () => {
  it("defaults leave teachers out", () => {
    const rows = resolveChecklist(new Set(DEFAULT_ITEMS), {});
    expect(find(rows, "homeroom_teachers").checked).toBe(false);
    expect(find(rows, "teaching_assignments").checked).toBe(false);
    expect(find(rows, "timetable").checked).toBe(false);
    expect(find(rows, "terms").checked).toBe(true);
    expect(find(rows, "evaluation_weights").checked).toBe(true);
  });

  it("unchecking classes disables homeroom teachers and assignments with a reason", () => {
    const selected = new Set(DEFAULT_ITEMS);
    selected.delete("classes");
    selected.add("homeroom_teachers");
    selected.add("teaching_assignments");
    const rows = resolveChecklist(selected, {});
    const homeroom = find(rows, "homeroom_teachers");
    const assignments = find(rows, "teaching_assignments");
    expect(homeroom).toMatchObject({ checked: false, disabled: true, reason: "Butuh Kelas" });
    expect(assignments).toMatchObject({ checked: false, disabled: true, reason: "Butuh Kelas" });
  });

  it("existing target classes keep assignments enabled", () => {
    const selected = new Set(DEFAULT_ITEMS);
    selected.delete("classes");
    selected.add("teaching_assignments");
    const rows = resolveChecklist(selected, { classes: true });
    expect(find(rows, "teaching_assignments")).toMatchObject({ checked: true, disabled: false });
    expect(find(rows, "teaching_assignments").reason).toBeUndefined();
  });

  it("unchecked curriculum disables teaching assignments with a reason", () => {
    const selected = new Set(DEFAULT_ITEMS);
    selected.delete("curriculum");
    selected.add("teaching_assignments");
    const rows = resolveChecklist(selected, {});
    expect(find(rows, "teaching_assignments")).toMatchObject({
      checked: false,
      disabled: true,
      reason: "Butuh Kurikulum",
    });
  });

  it("existing target curriculum and classes keep assignments enabled", () => {
    const selected = new Set(DEFAULT_ITEMS);
    selected.delete("curriculum");
    selected.delete("classes");
    selected.add("teaching_assignments");
    const rows = resolveChecklist(selected, { curriculum: true, classes: true });
    expect(find(rows, "teaching_assignments")).toMatchObject({ checked: true, disabled: false });
  });

  it("timetable needs assignments", () => {
    const selected = new Set(DEFAULT_ITEMS);
    selected.add("timetable");
    const rows = resolveChecklist(selected, {});
    expect(find(rows, "timetable")).toMatchObject({
      checked: false,
      disabled: true,
      reason: "Butuh Penugasan guru",
    });
  });

  it("evaluation weights need report types", () => {
    const selected = new Set(DEFAULT_ITEMS);
    selected.delete("report_types");
    const rows = resolveChecklist(selected, {});
    expect(find(rows, "evaluation_weights")).toMatchObject({
      checked: false,
      disabled: true,
      reason: "Butuh Tipe rapor",
    });
  });
});

describe("shiftTermDates", () => {
  it("shifts by the year offset", () => {
    const out = shiftTermDates("2025-07-01", "2026-07-01", [
      { term_id: "t1", name: "Genap", start_date: "2026-01-01", end_date: "2026-06-30" },
    ]);
    expect(out).toEqual([
      { source_term_id: "t1", name: "Genap", start_date: "2027-01-01", end_date: "2027-06-30" },
    ]);
  });

  it("clamps 29 February", () => {
    const out = shiftTermDates("2023-07-01", "2024-07-01", [
      { term_id: "t1", name: "Genap", start_date: "2024-01-01", end_date: "2024-02-29" },
    ]);
    expect(out[0].end_date).toBe("2025-02-28");
  });

  it("shifts by months when start months differ", () => {
    const out = shiftTermDates("2025-07-01", "2026-01-01", [
      { term_id: "t1", name: "Ganjil", start_date: "2025-07-01", end_date: "2025-12-31" },
    ]);
    expect(out[0].start_date).toBe("2026-01-01");
    expect(out[0].end_date).toBe("2026-06-30");
  });

  it("clamps 31st to month end", () => {
    const out = shiftTermDates("2025-07-01", "2025-08-01", [
      { term_id: "t1", name: "X", start_date: "2025-08-31", end_date: "2025-08-31" },
    ]);
    expect(out[0].start_date).toBe("2025-09-30");
  });
});
