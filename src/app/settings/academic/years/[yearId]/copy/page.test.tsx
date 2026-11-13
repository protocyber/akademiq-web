/** @vitest-environment jsdom */
import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  run: { data: null as unknown, isLoading: false },
  mounts: vi.fn(),
  props: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useParams: () => ({ yearId: "year-1" }) }));
vi.mock("@/components/features/academic-config/academic-settings", () => ({
  AcademicSettingsPage: ({ children }: { children: (ctx: unknown) => React.ReactNode }) => (
    <div>{children({})}</div>
  ),
}));
vi.mock("@/lib/query/queries/use-year-copy", () => ({
  useCurrentCopyRun: () => m.run,
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
});
