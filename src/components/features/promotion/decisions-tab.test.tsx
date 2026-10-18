/** @vitest-environment jsdom */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mutateAsync = vi.hoisted(() => vi.fn());
vi.mock("@/lib/query/mutations/use-promotion", () => ({
  useOverrideDecision: () => ({ mutateAsync, isPending: false }),
}));

import { DecisionsTab } from "@/components/features/promotion/decisions-tab";
import type { PromotionDecision } from "@/lib/query/queries/use-promotion";

function decision(partial: Partial<PromotionDecision> & { decision_id: string }): PromotionDecision {
  return {
    student_id: `s-${partial.decision_id}`,
    homeroom_id: "h1",
    recommended: "promote",
    result: "promote",
    overridden: false,
    reason: null,
    computed_metrics: {
      subjects_counted: 10,
      subjects_below_kkm: 0,
      average: 82.4,
      kkm_used: 75,
      criteria: { min_average: 70, max_subjects_below_kkm: 2, min_attendance_percent: null },
    },
    target_homeroom_id: null,
    target_enrollment_id: null,
    full_name: "Ani",
    nis: "1001",
    homeroom_name: "X-1",
    source_ordinal: 1,
    ...partial,
  };
}

const rows = [
  decision({ decision_id: "d1" }),
  decision({
    decision_id: "d2",
    full_name: "Budi",
    nis: "1002",
    result: "retain",
    overridden: true,
    reason: "Sering tidak hadir semester dua",
  }),
];

describe("DecisionsTab", () => {
  it("lists students with metrics and marks overrides", () => {
    render(<DecisionsTab decisions={rows} editable={false} homeroomNames={new Map()} />);
    expect(screen.getByText("Ani")).toBeInTheDocument();
    expect(screen.getAllByText("82,4").length).toBeGreaterThan(0);
    expect(screen.getByText("Override")).toBeInTheDocument();
    expect(screen.getByText("Sering tidak hadir semester dua")).toBeInTheDocument();
  });

  it("offers Ubah only when editable", () => {
    const { rerender } = render(<DecisionsTab decisions={rows} editable={false} homeroomNames={new Map()} />);
    expect(screen.queryByRole("button", { name: "Ubah Ani" })).not.toBeInTheDocument();
    rerender(<DecisionsTab decisions={rows} editable homeroomNames={new Map()} />);
    expect(screen.getByRole("button", { name: "Ubah Ani" })).toBeInTheDocument();
  });

  it("filters to overridden decisions", () => {
    render(<DecisionsTab decisions={rows} editable={false} homeroomNames={new Map()} />);
    fireEvent.click(screen.getByLabelText("Hanya override"));
    expect(screen.queryByText("Ani")).not.toBeInTheDocument();
    expect(screen.getByText("Budi")).toBeInTheDocument();
  });

  it("override dialog requires a reason when the result differs", async () => {
    render(<DecisionsTab decisions={rows} editable homeroomNames={new Map()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ubah Ani" }));
    // Dialog opens with result = current result (promote = recommended); pick retain.
    fireEvent.click(screen.getByRole("combobox", { name: "Hasil" }));
    fireEvent.click(await screen.findByRole("option", { name: "Tinggal" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(await screen.findByText("Alasan minimal 10 karakter")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
