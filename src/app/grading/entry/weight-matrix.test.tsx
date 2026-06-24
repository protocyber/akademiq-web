import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reportTypes = [
  { report_type_id: "rtA", code: "Rapor UTS", name: "Rapor Tengah Semester", position: 0 },
];

vi.mock("@/lib/query/queries/use-grading", () => ({
  useReportTypes: () => ({ data: reportTypes, isLoading: false }),
  useReportFormulasForTypes: () => ({ data: new Map(), isLoading: false }),
}));
const mutateAsync = vi.fn();
vi.mock("@/lib/query/mutations/use-grading", () => ({
  useUpsertReportFormula: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/components/ui/toaster", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { WeightMatrix } from "@/app/grading/entry/page";
import type { Evaluation } from "@/lib/query/queries/use-grading";

const evaluations: Evaluation[] = [
  {
    evaluation_id: "e1",
    tenant_id: "t1",
    homeroom_id: "h1",
    subject_id: "s1",
    academic_year_id: "y1",
    term_id: "term1",
    code: "UH1",
    name: "Quiz 1",
    position: 1,
    created_at: "2026-06-15T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
  },
  {
    evaluation_id: "e2",
    tenant_id: "t1",
    homeroom_id: "h1",
    subject_id: "s1",
    academic_year_id: "y1",
    term_id: "term1",
    code: "UTS",
    name: "Mid",
    position: 2,
    created_at: "2026-06-15T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
  },
];

describe("Bobot per Jenis Rapor (WeightMatrix)", () => {
  beforeEach(() => mutateAsync.mockReset());

  it("disables the column save until weights total exactly 100", () => {
    render(<WeightMatrix yearId="y1" homeroomId="h1" subjectId="s1" evaluations={evaluations} />);

    const save = screen.getByRole("button", { name: /simpan rapor uts/i });
    expect(save).toBeDisabled();

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    act(() => {
      fireEvent.change(inputs[0], { target: { value: "25" } });
      fireEvent.change(inputs[1], { target: { value: "75" } });
    });

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(save).not.toBeDisabled();
  });

  it("saves the (report_type, subject) weights when the column totals 100", async () => {
    render(<WeightMatrix yearId="y1" homeroomId="h1" subjectId="s1" evaluations={evaluations} />);

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    act(() => {
      fireEvent.change(inputs[0], { target: { value: "25" } });
      fireEvent.change(inputs[1], { target: { value: "75" } });
    });

    const save = screen.getByRole("button", { name: /simpan rapor uts/i });
    mutateAsync.mockResolvedValueOnce({});
    act(() => fireEvent.click(save));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({
      subjectId: "s1",
      weights: { e1: 25, e2: 75 },
    });
  });

  it("flags a column total that is not 100 and keeps save disabled", () => {
    render(<WeightMatrix yearId="y1" homeroomId="h1" subjectId="s1" evaluations={evaluations} />);

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    act(() => {
      fireEvent.change(inputs[0], { target: { value: "40" } });
      fireEvent.change(inputs[1], { target: { value: "40" } });
    });

    const total = within(screen.getByText("Total").closest("tr")!).getByText("80%");
    expect(total).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simpan rapor uts/i })).toBeDisabled();
  });
});
