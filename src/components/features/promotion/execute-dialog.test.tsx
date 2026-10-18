/** @vitest-environment jsdom */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiHttpError } from "@/lib/api/types";
import type { PromotionRunDetail } from "@/lib/query/queries/use-promotion";

const execute = vi.hoisted(() => vi.fn());
vi.mock("@/lib/query/mutations/use-promotion", () => ({
  useExecutePromotionRun: () => ({ mutateAsync: execute, isPending: false }),
}));

import { ExecuteDialog, canConfirmExecution } from "@/components/features/promotion/execute-dialog";

const STUDENT = "44444444-4444-4444-8444-444444444444";

function detail(unassigned: number): PromotionRunDetail {
  return {
    run: { run_id: "run-1", status: "approved", target_academic_year_id: "year-t" },
    counts: { promote: 10, retain: 1, graduate: 0 },
    placement: [
      { homeroom_id: "h", name: "XI-A", capacity: 30, existing_active: 0, assigned: 31, total: 31, over_capacity: true },
    ],
    unassigned,
  } as unknown as PromotionRunDetail;
}

describe("canConfirmExecution", () => {
  it("needs every student placed and the exact year name", () => {
    expect(canConfirmExecution("2026/2027", "2026/2027", 0)).toBe(true);
    expect(canConfirmExecution("  2026/2027 ", "2026/2027", 0)).toBe(true);
    expect(canConfirmExecution("2026/2028", "2026/2027", 0)).toBe(false);
    expect(canConfirmExecution("", "2026/2027", 0)).toBe(false);
    expect(canConfirmExecution("2026/2027", "2026/2027", 1)).toBe(false);
  });
});

describe("ExecuteDialog", () => {
  beforeEach(() => execute.mockReset());

  it("blocks execution while students lack a target", () => {
    render(<ExecuteDialog open onOpenChange={() => undefined} detail={detail(2)} decisions={[]} targetYearName="2026/2027" />);
    expect(screen.getByText("Lengkapi tujuan 2 siswa dulu.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eksekusi" })).toBeDisabled();
  });

  it("enables after the exact year name is typed and warns about capacity", () => {
    render(<ExecuteDialog open onOpenChange={() => undefined} detail={detail(0)} decisions={[]} targetYearName="2026/2027" />);
    expect(screen.getByText(/XI-A/)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Eksekusi" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Ketik nama tahun tujuan untuk konfirmasi"), { target: { value: "2026/2027" } });
    expect(button).toBeEnabled();
  });

  it("shows grouped backend errors with student names", async () => {
    execute.mockRejectedValueOnce(
      new ApiHttpError(400, {
        code: "VALIDATION_ERROR",
        message: "invalid",
        fields: { enrollments: [`student ${STUDENT} is already enrolled in the target academic year`] },
      }),
    );
    render(
      <ExecuteDialog
        open
        onOpenChange={() => undefined}
        detail={detail(0)}
        decisions={[{ student_id: STUDENT, full_name: "Ani" } as never]}
        targetYearName="2026/2027"
      />,
    );
    fireEvent.change(screen.getByLabelText("Ketik nama tahun tujuan untuk konfirmasi"), { target: { value: "2026/2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Eksekusi" }));
    expect(await screen.findByText("Bentrok enrollment")).toBeInTheDocument();
    expect(screen.getByText("Ani is already enrolled in the target academic year")).toBeInTheDocument();
  });
});
