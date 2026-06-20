/** @vitest-environment jsdom */
import * as React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { AcademicScopeProvider } from "@/components/providers/academic-scope-provider";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import { getAccessToken } from "@/lib/api/client";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useAcademicYears, useCurriculumVersions, useTerms } from "@/lib/query/queries/use-academic-config";
import { QueryProvider } from "@/lib/query/provider";

import GradeEntryPage from "@/app/grading/entry/page";
import ReportCardsPage from "@/app/grading/report-cards/page";

// Hoisted Mocks
vi.mock("@/lib/api/client", () => ({
  getAccessToken: vi.fn(() => "fake-token"),
  getIdentityToken: vi.fn(() => "fake-token"),
  clearAllTokens: vi.fn(),
  clearTokens: vi.fn(),
  setIdentityToken: vi.fn(),
  setTokens: vi.fn(),
}));

vi.mock("@/lib/query/queries/use-tenant-me", () => ({
  useTenantMe: vi.fn(),
}));

vi.mock("@/lib/query/queries/use-tenant-roles", () => ({
  useTenantPermissions: vi.fn(() => ({ data: [], isLoading: false })),
  useTenantRoles: vi.fn(() => ({ data: [], isLoading: false })),
  useAllTenantRoles: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useAcademicYears: vi.fn(),
  useCurriculumVersions: vi.fn(),
  useTerms: vi.fn(() => ({ data: [], isLoading: false })),
  useSubjects: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/query/queries/use-me", () => ({
  useMe: () => ({ data: { full_name: "Test User", email: "test@user.com" }, isLoading: false }),
}));

vi.mock("@/lib/query/mutations/use-logout", () => ({
  useLogout: () => ({ isPending: false }),
}));

vi.mock("@/lib/query/queries/use-academic-ops", () => ({
  useHomerooms: () => ({ data: [], isLoading: false }),
  useTeachingAssignments: () => ({ data: [], isLoading: false }),
  useHomeroomRoster: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/query/queries/use-grading", () => ({
  useClassGrades: () => ({ data: [], isLoading: false }),
  useEvaluations: () => ({ data: [], isLoading: false }),
  useReportTypes: () => ({ data: [], isLoading: false }),
  useSubjectReportScoresForTypes: () => ({ data: new Map(), isLoading: false }),
}));

function ConsumerComponent() {
  const { yearId, curriculumId, setYearId, setCurriculumId, isResolving } = useAcademicScope();
  return (
    <div>
      <span data-testid="is-resolving">{String(isResolving)}</span>
      <span data-testid="year-id">{yearId ?? "null"}</span>
      <span data-testid="curriculum-id">{curriculumId ?? "null"}</span>
      <button onClick={() => setYearId("year-2")}>Set Year 2</button>
      <button onClick={() => setCurriculumId("cur-2")}>Set Curriculum 2</button>
    </div>
  );
}

describe("AcademicScopeProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    vi.mocked(getAccessToken).mockReturnValue("fake-token");
    vi.mocked(useTenantMe).mockReturnValue({
      data: {
        tenant_id: "tenant-1",
        school_name: "Test School",
        modules: [
          { feature_code: "grading", plan_entitled: true, enabled: true },
          { feature_code: "academic_ops", plan_entitled: true, enabled: true },
        ],
      },
      isLoading: false,
    } as unknown as never);
    vi.mocked(useTerms).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to Active year and newest curriculum version", async () => {
    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-1", name: "Year 1", status: "Active", start_date: "2024-01-01", end_date: "2024-12-31" },
        { academic_year_id: "year-2", name: "Year 2", status: "Draft", start_date: "2025-01-01", end_date: "2025-12-31" },
      ],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
        { curriculum_version_id: "cur-2", name: "v2.0" },
      ],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useTerms).mockReturnValue({
      data: [{ term_id: "t-1", name: "Semester 1", status: "Active", start_date: "2024-01-01", end_date: "2024-06-30" }],
      isLoading: false,
    } as unknown as never);

    render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    expect(screen.getByTestId("year-id").textContent).toBe("year-1");
    expect(screen.getByTestId("curriculum-id").textContent).toBe("cur-2");
  });

  it("overrides localStorage with auto-resolve on mount", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ academic_year_id: "year-2", curriculum_version_id: "cur-1" })
    );

    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-1", name: "Year 1", status: "Active", start_date: "2024-01-01", end_date: "2024-12-31" },
        { academic_year_id: "year-2", name: "Year 2", status: "Draft", start_date: "2025-01-01", end_date: "2025-12-31" },
      ],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
        { curriculum_version_id: "cur-2", name: "v2.0" },
      ],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useTerms).mockReturnValue({
      data: [{ term_id: "t-1", name: "Semester 1", status: "Active", start_date: "2024-01-01", end_date: "2024-06-30" }],
      isLoading: false,
    } as unknown as never);

    render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    // Despite localStorage having year-2, auto-resolve picks active year year-1
    expect(screen.getByTestId("year-id").textContent).toBe("year-1");
    expect(screen.getByTestId("curriculum-id").textContent).toBe("cur-2");
    // localStorage was written with auto-resolved values
    expect(localStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining("akademiq.academic_scope"),
      expect.stringContaining("year-1")
    );
  });

  it("falls back to newest year by start_date when no active year", async () => {
    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-1", name: "Year 1", status: "Inactive", start_date: "2024-01-01", end_date: "2024-12-31" },
        { academic_year_id: "year-2", name: "Year 2", status: "Draft", start_date: "2025-01-01", end_date: "2025-12-31" },
      ],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useTerms).mockReturnValue({
      data: [{ term_id: "t-1", name: "Semester 1", status: "Inactive", start_date: "2025-01-01", end_date: "2025-06-30" }],
      isLoading: false,
    } as unknown as never);

    render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    expect(screen.getByTestId("year-id").textContent).toBe("year-2");
    expect(screen.getByTestId("curriculum-id").textContent).toBe("null");
  });

  it("sets year to newest when no active year exists", async () => {
    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-2", name: "Year 2", status: "Draft", start_date: "2025-01-01", end_date: "2025-12-31" },
      ],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useTerms).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as never);

    render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    expect(screen.getByTestId("year-id").textContent).toBe("year-2");
    expect(screen.getByTestId("curriculum-id").textContent).toBe("null");
  });

  it("writes auto-resolved scope to localStorage", async () => {
    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-1", name: "Year 1", status: "Active", start_date: "2024-01-01", end_date: "2024-12-31" },
      ],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
      ],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useTerms).mockReturnValue({
      data: [{ term_id: "t-1", name: "Semester 1", status: "Active", start_date: "2024-01-01", end_date: "2024-06-30" }],
      isLoading: false,
    } as unknown as never);

    render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining("akademiq.academic_scope"),
      expect.any(String)
    );
  });
});

describe("AcademicScope integration with screens", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    vi.mocked(getAccessToken).mockReturnValue("fake-token");
    vi.mocked(useTenantMe).mockReturnValue({
      data: {
        tenant_id: "tenant-1",
        school_name: "Test School",
        modules: [
          { feature_code: "grading", plan_entitled: true, enabled: true },
          { feature_code: "academic_ops", plan_entitled: true, enabled: true },
        ],
      },
      isLoading: false,
    } as unknown as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asserts no page-level academic-year selector remains on grade entry page", async () => {
    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-1", name: "Year 1", status: "Active" },
      ],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
      ],
      isLoading: false,
    } as unknown as never);

    render(
      <QueryProvider>
        <AcademicScopeProvider>
          <GradeEntryPage />
        </AcademicScopeProvider>
      </QueryProvider>
    );

    // Wait for page rendering
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Pilih tahun aktif")).not.toBeInTheDocument();
    });
  });

  it("asserts no page-level academic-year selector remains on report cards page", async () => {
    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-1", name: "Year 1", status: "Active" },
      ],
      isLoading: false,
    } as unknown as never);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
      ],
      isLoading: false,
    } as unknown as never);

    render(
      <QueryProvider>
        <AcademicScopeProvider>
          <ReportCardsPage />
        </AcademicScopeProvider>
      </QueryProvider>
    );

    // Wait for page rendering
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Pilih tahun aktif")).not.toBeInTheDocument();
    });
  });
});
