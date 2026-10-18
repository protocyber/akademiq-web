/** @vitest-environment jsdom */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiHttpError } from "@/lib/api/types";
import type { PromotionDecision, PromotionRunDetail } from "@/lib/query/queries/use-promotion";

const assign = vi.hoisted(() => vi.fn());
const SRC_YEAR = "year-s";
const TGT_YEAR = "year-t";
const D1 = "11111111-1111-4111-8111-111111111111";
const D2 = "22222222-2222-4222-8222-222222222222";

vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useAcademicYears: () => ({
    data: [
      { academic_year_id: SRC_YEAR, name: "2025/2026", status: "Active" },
      { academic_year_id: TGT_YEAR, name: "2026/2027", status: "Draft" },
    ],
    isLoading: false,
  }),
}));
vi.mock("@/lib/query/queries/use-academic-ops", () => ({
  useHomeroomsForYear: () => ({
    data: [
      { homeroom_id: "t-xi-a", name: "XI-A", grade_level: "XI", grade_level_id: "g2", ordinal: 2, capacity: 30, academic_year_id: TGT_YEAR, enrolled_count: 0 },
      { homeroom_id: "t-x-a", name: "X-A", grade_level: "X", grade_level_id: "g1", ordinal: 1, capacity: 30, academic_year_id: TGT_YEAR, enrolled_count: 0 },
    ],
    isLoading: false,
  }),
}));
vi.mock("@/lib/query/mutations/use-promotion", () => ({
  useSetPromotionTarget: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAssignPromotionTargets: () => ({ mutateAsync: assign, isPending: false }),
}));

import { PlacementTab } from "@/components/features/promotion/placement-tab";

function decision(id: string, result: "promote" | "retain", name: string): PromotionDecision {
  return {
    decision_id: id,
    student_id: `s-${id}`,
    homeroom_id: "src-x1",
    recommended: result,
    result,
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
    full_name: name,
    nis: id.slice(0, 4),
    homeroom_name: "X-1",
    source_ordinal: 1,
  };
}

const detail = {
  run: {
    run_id: "run-1",
    academic_year_id: SRC_YEAR,
    status: "approved",
    target_academic_year_id: TGT_YEAR,
  },
  placement: [
    { homeroom_id: "t-xi-a", name: "XI-A", capacity: 30, existing_active: 2, assigned: 29, total: 31, over_capacity: true },
  ],
  unassigned: 2,
} as unknown as PromotionRunDetail;

describe("PlacementTab", () => {
  beforeEach(() => assign.mockReset());

  it("fills a class default, saves the changes in one request, and reports dirtiness", async () => {
    const onDirtyChange = vi.fn();
    assign.mockResolvedValueOnce({ updated: 1 });
    render(
      <PlacementTab
        detail={detail}
        decisions={[decision(D1, "promote", "Ani"), decision(D2, "retain", "Budi")]}
        editable
        onDirtyChange={onDirtyChange}
      />,
    );
    expect(screen.getByText("Melebihi kapasitas")).toBeInTheDocument();
    expect(screen.getByText("2 siswa belum punya tujuan")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: "Naik ke untuk X-1" }));
    fireEvent.click(await screen.findByRole("option", { name: "XI-A" }));
    expect(screen.getByText("1 perubahan belum disimpan")).toBeInTheDocument();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(assign).toHaveBeenCalledWith([{ decision_id: D1, homeroom_id: "t-xi-a" }]);
  });

  it("keeps the draft and shows each rejected decision on its row", async () => {
    assign.mockRejectedValueOnce(
      new ApiHttpError(400, {
        code: "VALIDATION_ERROR",
        message: "invalid",
        fields: { assignments: [`decision ${D1}: homeroom XI-A is ordinal 2, expected 1`] },
      }),
    );
    render(
      <PlacementTab
        detail={detail}
        decisions={[decision(D1, "promote", "Ani"), decision(D2, "retain", "Budi")]}
        editable
        onDirtyChange={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Naik ke untuk X-1" }));
    fireEvent.click(await screen.findByRole("option", { name: "XI-A" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText("homeroom XI-A is ordinal 2, expected 1")).toBeInTheDocument();
    expect(screen.getByText("1 perubahan belum disimpan")).toBeInTheDocument();
  });

  it("is read-only when not editable", () => {
    render(
      <PlacementTab
        detail={detail}
        decisions={[decision(D1, "promote", "Ani")]}
        editable={false}
        onDirtyChange={() => undefined}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Naik ke untuk X-1" })).toBeDisabled();
  });
});
