/** @vitest-environment jsdom */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  push: vi.fn(),
  years: [] as unknown[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: m.push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/features/academic-config/academic-settings", () => ({
  AcademicSettingsPage: ({ children }: { children: (ctx: unknown) => React.ReactNode }) => (
    <div>{children({ canManageAcademicConfig: true, upgradeMessage: "" })}</div>
  ),
  EntitlementTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/features/academic-config/year-copy/resume-banner", () => ({
  CopyRunResumeBanner: ({ targetYearId }: { targetYearId: string }) => (
    <div data-testid="banner">{targetYearId}</div>
  ),
}));
vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useAcademicYearsTable: () => ({ data: { data: m.years }, isLoading: false, error: null }),
  useAcademicYears: () => ({ data: m.years }),
  useCurriculumVersions: () => ({ data: [] }),
  useGradingPolicy: () => ({ data: null }),
}));
vi.mock("@/lib/query/mutations/use-academic-config", () => {
  const mut = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    useBulkDeleteAcademicYears: mut,
    useCreateAcademicYear: mut,
    useDeleteAcademicYear: mut,
    useTransitionAcademicYear: mut,
    useUpdateAcademicYear: mut,
    useAddCurriculumVersion: mut,
    useDeleteCurriculumVersion: mut,
    useUpsertGradingPolicy: mut,
  };
});

import AcademicYearsPage from "./page";

function year(id: string, status: string) {
  return {
    academic_year_id: id,
    name: `Tahun ${id}`,
    start_date: "2026-07-01",
    end_date: "2027-06-30",
    status,
  };
}

function openMenu(name: string) {
  const triggers = screen.getAllByRole("button", { name: "Aksi lainnya" });
  const idx = ["draft-1", "active-1"].indexOf(name);
  fireEvent.keyDown(triggers[idx], { key: "Enter" });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.years = [year("draft-1", "Draft"), year("active-1", "Active")];
});

describe("AcademicYearsPage", () => {
  it("Buat Tahun Ajaran opens the copy wizard", () => {
    render(<AcademicYearsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Buat Tahun Ajaran/ }));
    expect(m.push).toHaveBeenCalledWith("/settings/academic/years/copy");
  });

  it("Draft rows offer the copy menu item and navigate to the year's copy page", async () => {
    render(<AcademicYearsPage />);
    openMenu("draft-1");
    fireEvent.click(await screen.findByText("Salin dari tahun lain"));
    expect(m.push).toHaveBeenCalledWith("/settings/academic/years/draft-1/copy");
  });

  it("Active rows do not offer the copy menu item", async () => {
    render(<AcademicYearsPage />);
    openMenu("active-1");
    await screen.findByText("Hapus");
    expect(screen.queryByText("Salin dari tahun lain")).toBeNull();
  });

  it("renders one resume banner per Draft year only", () => {
    render(<AcademicYearsPage />);
    expect(screen.getAllByTestId("banner").map((b) => b.textContent)).toEqual(["draft-1"]);
  });
});
