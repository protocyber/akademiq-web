/** @vitest-environment jsdom */
import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  push: vi.fn(),
  createYear: vi.fn(),
  toastSuccess: vi.fn(),
  years: [] as unknown[],
  roles: ["tenant_admin"] as string[],
  perms: ["academic.config.write"] as string[],
}));
vi.mock("@/lib/auth/access-claims", () => ({
  hasAccessRole: (c: string) => m.roles.includes(c),
  hasAccessPerm: (c: string) => m.perms.includes(c),
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
vi.mock("@/components/features/academic-config/year-copy/year-copy-dialog", () => ({
  YearCopyDialog: ({ targetYearId, targetYearName }: { targetYearId: string | null; targetYearName?: string }) =>
    targetYearId ? <div data-testid="copy-dialog">{`${targetYearId}|${targetYearName}`}</div> : null,
}));
vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useAcademicYearsTable: () => ({ data: { data: m.years }, isLoading: false, error: null }),
  useAcademicYears: () => ({ data: m.years }),
  useCurriculumVersions: () => ({ data: [] }),
  useGradingPolicy: () => ({ data: null }),
}));
vi.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
    <input type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/ui/toaster", () => ({
  toast: { success: m.toastSuccess, error: vi.fn() },
}));
vi.mock("@/lib/query/mutations/use-academic-config", () => {
  const mut = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    useBulkDeleteAcademicYears: mut,
    useCreateAcademicYear: () => ({ mutateAsync: m.createYear, isPending: false }),
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

async function fillAndSubmitCreate() {
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByPlaceholderText("contoh: 2026/2027"), { target: { value: "2027/2028" } });
  const dates = dialog.querySelectorAll('input[type="date"]');
  fireEvent.change(dates[0], { target: { value: "2027-07-15" } });
  fireEvent.change(dates[1], { target: { value: "2028-06-30" } });
  fireEvent.submit(dialog.querySelector("form#academic-year-identity")!);
}

function openMenu(name: string) {
  const triggers = screen.getAllByRole("button", { name: "Aksi lainnya" });
  const idx = ["draft-1", "active-1"].indexOf(name);
  fireEvent.keyDown(triggers[idx], { key: "Enter" });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.roles = ["tenant_admin"];
  m.perms = ["academic.config.write"];
  m.years = [year("draft-1", "Draft"), year("active-1", "Active")];
});

describe("AcademicYearsPage", () => {
  it("Buat Tahun Ajaran opens the create modal, not a page", async () => {
    render(<AcademicYearsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Buat Tahun Ajaran/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(m.push).not.toHaveBeenCalled();
  });

  it("after a create, the toast offers to copy into the new year", async () => {
    m.createYear.mockResolvedValue(year("new-1", "Draft"));
    render(<AcademicYearsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Buat Tahun Ajaran/ }));
    await fillAndSubmitCreate();
    await waitFor(() => expect(m.toastSuccess).toHaveBeenCalled());
    const [message, opts] = m.toastSuccess.mock.calls[0];
    expect(message).toBe("Tahun ajaran dibuat.");
    expect(opts.action.label).toBe("Salin data dari tahun lain");
    act(() => opts.action.onClick());
    expect(await screen.findByTestId("copy-dialog")).toHaveTextContent("new-1|Tahun new-1");
    expect(m.push).not.toHaveBeenCalled();
  });

  it("Draft rows offer the copy menu item and open the copy modal", async () => {
    render(<AcademicYearsPage />);
    openMenu("draft-1");
    fireEvent.click(await screen.findByText("Salin dari tahun lain"));
    expect(await screen.findByTestId("copy-dialog")).toHaveTextContent("draft-1|Tahun draft-1");
    expect(m.push).not.toHaveBeenCalled();
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

  describe("without tenant_admin + academic.config.write", () => {
    beforeEach(() => {
      m.roles = ["teacher"];
      m.perms = [];
    });

    it("renders no resume banner", () => {
      render(<AcademicYearsPage />);
      expect(screen.queryAllByTestId("banner")).toHaveLength(0);
    });

    it("hides the copy menu item", async () => {
      render(<AcademicYearsPage />);
      openMenu("draft-1");
      await screen.findByText("Hapus");
      expect(screen.queryByText("Salin dari tahun lain")).toBeNull();
    });

    it("after a create, the toast has no copy action", async () => {
      m.createYear.mockResolvedValue(year("new-1", "Draft"));
      render(<AcademicYearsPage />);
      fireEvent.click(screen.getByRole("button", { name: /Buat Tahun Ajaran/ }));
      await fillAndSubmitCreate();
      await waitFor(() => expect(m.toastSuccess).toHaveBeenCalledWith("Tahun ajaran dibuat.", undefined));
    });
  });
});
