/** @vitest-environment jsdom */
import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  run: { data: null as unknown, isLoading: false },
  updateRun: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  onResume: vi.fn(),
}));

vi.mock("@/lib/query/queries/use-year-copy", () => ({
  useCurrentCopyRun: () => m.run,
}));
vi.mock("@/lib/query/mutations/use-year-copy", () => ({
  useUpdateCopyRun: () => ({ mutateAsync: m.updateRun, isPending: false }),
}));
vi.mock("@/components/ui/toaster", () => ({
  toast: { success: m.toastSuccess, error: m.toastError },
}));

import { CopyRunResumeBanner } from "./resume-banner";

const run = {
  copy_run_id: "run-1",
  source_academic_year_id: "src-1",
  target_academic_year_id: "year-2",
  items: ["terms", "classes", "report_types"],
  status: "in_progress",
  config_result: [
    { item: "terms", source: 2, target_existing: 0, copied: 2, skipped: 0 },
  ],
  ops_result: null,
  grading_result: null,
};

function renderBanner() {
  return render(
    <CopyRunResumeBanner
      targetYearId="year-2"
      targetYearName="2026-2027"
      sourceYearName="2025-2026"
      onResume={m.onResume}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  m.run = { data: run, isLoading: false };
  m.updateRun.mockResolvedValue({});
});

describe("CopyRunResumeBanner", () => {
  it("shows source and parts done", () => {
    renderBanner();
    expect(
      screen.getByText("Penyalinan dari 2025-2026 belum selesai (1 dari 3 bagian)"),
    ).toBeTruthy();
  });

  it("Lanjutkan opens the copy wizard", () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    expect(m.onResume).toHaveBeenCalledTimes(1);
  });

  it("Batalkan cancels the run only after confirming", async () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: "Batalkan" }));
    expect(m.updateRun).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Ya, batalkan" }));
    await waitFor(() =>
      expect(m.updateRun).toHaveBeenCalledWith({ copyRunId: "run-1", status: "cancelled" }),
    );
    await waitFor(() => expect(m.toastSuccess).toHaveBeenCalled());
  });

  it("shows the error message when cancelling fails", async () => {
    m.updateRun.mockRejectedValue(new Error("boom"));
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: "Batalkan" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ya, batalkan" }));
    await waitFor(() => expect(m.toastError).toHaveBeenCalled());
  });

  it("falls back to a generic source name", () => {
    render(<CopyRunResumeBanner targetYearId="year-2" targetYearName="2026-2027" onResume={m.onResume} />);
    expect(
      screen.getByText("Penyalinan dari tahun sumber belum selesai (1 dari 3 bagian)"),
    ).toBeTruthy();
  });

  it("renders nothing without a run", () => {
    m.run = { data: null, isLoading: false };
    const { container } = renderBanner();
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing while loading", () => {
    m.run = { data: undefined, isLoading: true };
    const { container } = renderBanner();
    expect(container.innerHTML).toBe("");
  });
});
