/** @vitest-environment jsdom */
import * as React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { AcademicScopeProvider } from "@/components/providers/academic-scope-provider";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import { getAccessToken } from "@/lib/api/client";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useAcademicYears, useCurriculumVersions, useSubjects } from "@/lib/query/queries/use-academic-config";
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
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to Active year and newest curriculum version", async () => {
    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-1", name: "Year 1", status: "Active" },
        { academic_year_id: "year-2", name: "Year 2", status: "Draft" },
      ],
      isLoading: false,
    } as any);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
        { curriculum_version_id: "cur-2", name: "v2.0" },
      ],
      isLoading: false,
    } as any);

    render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    // Wait for resolution
    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    expect(screen.getByTestId("year-id").textContent).toBe("year-1");
    // Should select newest curriculum (last in list)
    expect(screen.getByTestId("curriculum-id").textContent).toBe("cur-2");
  });

  it("restores from localStorage if valid", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ academic_year_id: "year-2", curriculum_version_id: "cur-1" })
    );

    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-1", name: "Year 1", status: "Active" },
        { academic_year_id: "year-2", name: "Year 2", status: "Draft" },
      ],
      isLoading: false,
    } as any);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
        { curriculum_version_id: "cur-2", name: "v2.0" },
      ],
      isLoading: false,
    } as any);

    render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    expect(screen.getByTestId("year-id").textContent).toBe("year-2");
    expect(screen.getByTestId("curriculum-id").textContent).toBe("cur-1");
  });

  it("resets to Active if stored year is deleted/gone", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ academic_year_id: "deleted-year", curriculum_version_id: "cur-1" })
    );

    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-1", name: "Year 1", status: "Active" },
      ],
      isLoading: false,
    } as any);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
      ],
      isLoading: false,
    } as any);

    render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    expect(screen.getByTestId("year-id").textContent).toBe("year-1");
  });

  it("sets resolving to empty if no active year and no stored state", async () => {
    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-2", name: "Year 2", status: "Draft" },
      ],
      isLoading: false,
    } as any);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    expect(screen.getByTestId("year-id").textContent).toBe("null");
    expect(screen.getByTestId("curriculum-id").textContent).toBe("null");
  });

  it("persists the scope across a simulated reload", async () => {
    vi.mocked(useAcademicYears).mockReturnValue({
      data: [
        { academic_year_id: "year-1", name: "Year 1", status: "Active" },
        { academic_year_id: "year-2", name: "Year 2", status: "Draft" },
      ],
      isLoading: false,
    } as any);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
        { curriculum_version_id: "cur-2", name: "v2.0" },
      ],
      isLoading: false,
    } as any);

    let store: Record<string, string> = {};
    vi.mocked(localStorage.getItem).mockImplementation((key) => store[key] || null);
    vi.mocked(localStorage.setItem).mockImplementation((key, val) => {
      store[key] = val;
    });

    const { unmount } = render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    screen.getByText("Set Year 2").click();
    screen.getByText("Set Curriculum 2").click();

    await waitFor(() => {
      expect(screen.getByTestId("year-id").textContent).toBe("year-2");
      expect(screen.getByTestId("curriculum-id").textContent).toBe("cur-2");
    });

    unmount();

    render(
      <AcademicScopeProvider>
        <ConsumerComponent />
      </AcademicScopeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-resolving").textContent).toBe("false");
    });

    expect(screen.getByTestId("year-id").textContent).toBe("year-2");
    expect(screen.getByTestId("curriculum-id").textContent).toBe("cur-2");
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
    } as any);
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
    } as any);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
      ],
      isLoading: false,
    } as any);

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
    } as any);

    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: [
        { curriculum_version_id: "cur-1", name: "v1.0" },
      ],
      isLoading: false,
    } as any);

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
