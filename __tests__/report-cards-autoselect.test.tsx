/** @vitest-environment jsdom */
import * as React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

import ReportCardsPage from "@/app/grading/report-cards/page";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

const grading = vi.hoisted(() => ({
  reportTypes: [] as Array<{ report_type_id: string; name: string }>,
}));

vi.mock("@/components/features/auth-guard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/sidebar-layout", () => ({
  SidebarLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace }),
  useSearchParams: () => nav.searchParams,
}));

vi.mock("@/hooks/use-academic-scope", () => ({
  useAcademicScope: () => ({ yearId: "year-1", curriculumId: null, termId: null }),
}));

vi.mock("@/lib/query/queries/use-tenant-me", () => ({
  useTenantMe: () => ({ data: { tenant_id: "t1", school_name: "S" }, isLoading: false }),
}));

vi.mock("@/lib/query/queries/use-me", () => ({
  useMe: () => ({ data: { full_name: "U", email: "u@u.com" }, isLoading: false }),
}));

vi.mock("@/lib/query/mutations/use-logout", () => ({
  useLogout: () => ({ isPending: false }),
}));

vi.mock("@/lib/query/mutations/use-grading", () => ({
  useBulkTransitionReportCards: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGenerateReportCards: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/query/queries/use-academic-ops", () => ({
  useHomerooms: () => ({ data: [{ homeroom_id: "hr-1", name: "Kelas A" }], isLoading: false }),
  useHomeroomRoster: () => ({ data: [], isLoading: false }),
  useTeachingAssignments: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useSubjectsForYear: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/query/queries/use-grading", () => ({
  useReportTypes: () => ({ data: grading.reportTypes, isLoading: false }),
  useReportCards: () => ({ data: [], isLoading: false }),
  useBulkTransitionReportCards: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGenerateReportCards: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("Report cards auto-select", () => {
  beforeEach(() => {
    nav.replace.mockReset();
    nav.searchParams = new URLSearchParams();
    grading.reportTypes = [];
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("auto-selects the only report type on a clean URL (writes report_type_id only)", () => {
    grading.reportTypes = [{ report_type_id: "rt-1", name: "Rapor" }];
    nav.searchParams = new URLSearchParams();

    render(<ReportCardsPage />);

    const autoSelectCall = nav.replace.mock.calls.find(([url]) =>
      typeof url === "string" && url.includes("report_type_id=rt-1"),
    );
    expect(autoSelectCall).toBeTruthy();
    // Must NOT carry a stale homeroom_id.
    expect(autoSelectCall?.[0]).not.toContain("homeroom_id");
  });

  it("does not auto-select when there are multiple report types", () => {
    grading.reportTypes = [
      { report_type_id: "rt-1", name: "Rapor Tengah" },
      { report_type_id: "rt-2", name: "Rapor Akhir" },
    ];
    nav.searchParams = new URLSearchParams();

    render(<ReportCardsPage />);

    const wroteReportType = nav.replace.mock.calls.some(([url]) =>
      typeof url === "string" && url.includes("report_type_id="),
    );
    expect(wroteReportType).toBe(false);
  });

  it("does not auto-select when a homeroom filter is already present in the URL", () => {
    grading.reportTypes = [{ report_type_id: "rt-1", name: "Rapor" }];
    nav.searchParams = new URLSearchParams("homeroom_id=hr-1");

    render(<ReportCardsPage />);

    const wroteReportType = nav.replace.mock.calls.some(([url]) =>
      typeof url === "string" && url.includes("report_type_id="),
    );
    expect(wroteReportType).toBe(false);
  });
});
