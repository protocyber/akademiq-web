/** @vitest-environment jsdom */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  run: { data: null as unknown, isLoading: false } as Record<string, unknown>,
  yearId: "year-1",
  refetch: vi.fn(),
  mounts: vi.fn(),
  props: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useParams: () => ({ yearId: m.yearId }) }));
vi.mock("@/components/features/academic-config/academic-settings", () => ({
  AcademicSettingsPage: ({ children }: { children: (ctx: unknown) => React.ReactNode }) => (
    <div>{children({})}</div>
  ),
}));
vi.mock("@/lib/query/queries/use-year-copy", () => ({
  useCurrentCopyRun: () => m.run,
}));
vi.mock("@/lib/errors/messages", () => ({
  getErrorMessage: (e: Error) => `msg:${e.message}`,
}));
vi.mock("@/components/features/academic-config/year-copy/year-copy-wizard", () => ({
  YearCopyWizard: (props: { resumeRun?: { copy_run_id: string } }) => {
    const [state] = React.useState(() => {
      m.mounts();
      return "mounted";
    });
    m.props(props.resumeRun);
    return <div data-testid="wizard">{state}</div>;
  },
}));

import ExistingYearCopyPage from "./page";

const stored = { copy_run_id: "run-1" };

beforeEach(() => {
  vi.clearAllMocks();
  m.run = { data: null, isLoading: false };
  m.yearId = "year-1";
});

describe("ExistingYearCopyPage", () => {
  it("shows a skeleton until the first load settles", () => {
    m.run = { data: undefined, isLoading: true };
    render(<ExistingYearCopyPage />);
    expect(screen.queryByTestId("wizard")).toBeNull();
    expect(m.mounts).not.toHaveBeenCalled();
  });

  it("does not remount or switch to resume when null becomes a run", () => {
    const { rerender } = render(<ExistingYearCopyPage />);
    expect(m.mounts).toHaveBeenCalledTimes(1);
    m.run = { data: stored, isLoading: false };
    rerender(<ExistingYearCopyPage />);
    expect(m.mounts).toHaveBeenCalledTimes(1);
    expect(m.props.mock.calls.every(([r]) => r === undefined)).toBe(true);
  });

  it("does not remount or drop the resume run when it becomes null", () => {
    m.run = { data: stored, isLoading: false };
    const { rerender } = render(<ExistingYearCopyPage />);
    m.run = { data: null, isLoading: false };
    rerender(<ExistingYearCopyPage />);
    expect(m.mounts).toHaveBeenCalledTimes(1);
    expect(m.props.mock.calls.every(([r]) => r === stored)).toBe(true);
  });

  it("captures the run that arrives after loading", () => {
    m.run = { data: undefined, isLoading: true };
    const { rerender } = render(<ExistingYearCopyPage />);
    m.run = { data: stored, isLoading: false };
    act(() => rerender(<ExistingYearCopyPage />));
    expect(m.mounts).toHaveBeenCalledTimes(1);
    expect(m.props).toHaveBeenLastCalledWith(stored);
  });

  it("does not hand the old run to the wizard when yearId changes", () => {
    m.run = { data: stored, isLoading: false };
    const { rerender } = render(<ExistingYearCopyPage />);
    m.yearId = "year-2";
    m.run = { data: null, isLoading: false };
    rerender(<ExistingYearCopyPage />);
    expect(m.props).toHaveBeenLastCalledWith(undefined);
  });

  it("shows an error with retry on a non-404 first-load failure instead of starting fresh", () => {
    m.run = { data: undefined, isLoading: false, isError: true, error: new Error("boom"), refetch: m.refetch };
    render(<ExistingYearCopyPage />);
    expect(screen.queryByTestId("wizard")).toBeNull();
    expect(screen.getByText("msg:boom")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(m.refetch).toHaveBeenCalled();
  });

  it("captures the run after a retry succeeds", () => {
    m.run = { data: undefined, isLoading: false, isError: true, error: new Error("boom"), refetch: m.refetch };
    const { rerender } = render(<ExistingYearCopyPage />);
    m.run = { data: stored, isLoading: false, isError: false };
    rerender(<ExistingYearCopyPage />);
    expect(m.props).toHaveBeenLastCalledWith(stored);
  });
});
