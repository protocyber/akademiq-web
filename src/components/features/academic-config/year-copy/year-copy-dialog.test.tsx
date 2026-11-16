/** @vitest-environment jsdom */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  run: { data: null as unknown, isLoading: false, isError: false, error: null, refetch: vi.fn() },
  wizardProps: [] as Array<Record<string, unknown>>,
  onClose: vi.fn(),
}));

vi.mock("@/lib/query/queries/use-year-copy", () => ({
  useCurrentCopyRun: () => m.run,
}));
vi.mock("./year-copy-wizard", () => ({
  YearCopyWizard: (props: Record<string, unknown>) => {
    m.wizardProps.push(props);
    return (
      <div data-testid="wizard">
        {String(props.targetYearId)}
        <button type="button" onClick={props.onClose as () => void}>
          close-from-wizard
        </button>
      </div>
    );
  },
}));

import { YearCopyDialog } from "./year-copy-dialog";

beforeEach(() => {
  vi.clearAllMocks();
  m.wizardProps = [];
  m.run = { data: null, isLoading: false, isError: false, error: null, refetch: vi.fn() };
});

describe("YearCopyDialog", () => {
  it("renders nothing while closed", () => {
    render(<YearCopyDialog targetYearId={null} onClose={m.onClose} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the wizard in a modal for the target year", () => {
    render(<YearCopyDialog targetYearId="year-2" targetYearName="2026/2027" onClose={m.onClose} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Salin dari tahun lain — 2026/2027");
    expect(screen.getByTestId("wizard")).toHaveTextContent("year-2");
    expect(m.wizardProps[0].resumeRun).toBeUndefined();
  });

  it("hands an unfinished run to the wizard to resume", () => {
    const run = { copy_run_id: "run-1", status: "in_progress" };
    m.run = { ...m.run, data: run };
    render(<YearCopyDialog targetYearId="year-2" onClose={m.onClose} />);
    expect(m.wizardProps[0].resumeRun).toBe(run);
  });

  it("waits for the copy run before mounting the wizard", () => {
    m.run = { ...m.run, isLoading: true };
    render(<YearCopyDialog targetYearId="year-2" onClose={m.onClose} />);
    expect(screen.queryByTestId("wizard")).toBeNull();
  });

  it("shows the load error with a retry", () => {
    m.run = { ...m.run, isError: true, error: new Error("boom") as never };
    render(<YearCopyDialog targetYearId="year-2" onClose={m.onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(m.run.refetch).toHaveBeenCalled();
    expect(screen.queryByTestId("wizard")).toBeNull();
  });

  it("closes from the wizard and from the close button", () => {
    render(<YearCopyDialog targetYearId="year-2" onClose={m.onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "close-from-wizard" }));
    fireEvent.click(screen.getByRole("button", { name: "Tutup" }));
    expect(m.onClose).toHaveBeenCalledTimes(2);
  });
});
