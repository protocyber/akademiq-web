/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { SidebarContent } from "@/components/layout/sidebar-layout";
import { getAccessToken } from "@/lib/api/client";
import { useTenantMe } from "@/lib/query/queries/use-tenant-me";
import { useTenantPermissions } from "@/lib/query/queries/use-tenant-roles";

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
  useTenantPermissions: vi.fn(),
  useTenantRoles: vi.fn(() => ({ data: [], isLoading: false })),
  useAllTenantRoles: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useAcademicYears: vi.fn(() => ({ data: [], isLoading: false })),
  useCurriculumVersions: vi.fn(() => ({ data: [], isLoading: false })),
  useSubjects: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/query/queries/use-me", () => ({
  useMe: () => ({ data: { full_name: "Test", email: "test@test.com" }, isLoading: false }),
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

vi.mock("@/hooks/use-academic-scope", () => ({
  useAcademicScope: () => ({
    yearId: null,
    curriculumId: null,
    setYearId: vi.fn(),
    setCurriculumId: vi.fn(),
    isResolving: false,
  }),
}));

function modulesFrom(moduleCodes: string[]) {
  return moduleCodes.map((code) => ({
    feature_code: code,
    plan_entitled: true,
    enabled: true,
  }));
}

describe("SidebarContent nav visibility", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    vi.mocked(getAccessToken).mockReturnValue("fake-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows all group headings for tenant_admin with all modules enabled", () => {
    vi.mocked(useTenantMe).mockReturnValue({
      data: {
        tenant_id: "t1",
        school_name: "Test",
        modules: modulesFrom(["academic_config", "grading", "academic_ops"]),
      },
      isLoading: false,
    } as unknown as never);
    vi.mocked(useTenantPermissions).mockReturnValue({
      data: [
        { code: "user.read", held: true },
        { code: "role.read", held: true },
        { code: "academic.config.read", held: true },
        { code: "grade.read", held: true },
        { code: "report.read", held: true },
        { code: "billing.view", held: true },
      ],
      isLoading: false,
    } as unknown as never);

    render(<SidebarContent pathname="/dashboard" />);

    // Dashboard always visible
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    // All group headings visible (admin has all permissions + modules)
    expect(screen.getByText("Pengaturan")).toBeInTheDocument();
    expect(screen.getByText("Operasional")).toBeInTheDocument();
    expect(screen.getByText("Akademik")).toBeInTheDocument();
  });

  it("hides Pengaturan group for teacher without user.read/role.read/billing.view/academic_config module", () => {
    vi.mocked(useTenantMe).mockReturnValue({
      data: {
        tenant_id: "t1",
        school_name: "Test",
        modules: modulesFrom(["grading", "academic_ops"]),
      },
      isLoading: false,
    } as unknown as never);
    vi.mocked(useTenantPermissions).mockReturnValue({
      data: [
        { code: "grade.read", held: true },
        { code: "report.read", held: true },
        { code: "academic.config.read", held: true },
      ],
      isLoading: false,
    } as unknown as never);

    render(<SidebarContent pathname="/dashboard" />);

    // Dashboard always visible
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    // Pengaturan hidden: no billing.view, user.read, role.read, or academic_config module
    expect(screen.queryByText("Pengaturan")).not.toBeInTheDocument();
    // Operasional visible because academic_ops module is enabled
    expect(screen.getByText("Operasional")).toBeInTheDocument();
    // Akademik visible: teacher has grading module + grade.read/report.read
    expect(screen.getByText("Akademik")).toBeInTheDocument();
  });

  it("shows only Dashboard, Akademik(partial), and no Operasional for a parent (report.read + grading module)", () => {
    vi.mocked(useTenantMe).mockReturnValue({
      data: {
        tenant_id: "t1",
        school_name: "Test",
        modules: modulesFrom(["grading"]),
      },
      isLoading: false,
    } as unknown as never);
    vi.mocked(useTenantPermissions).mockReturnValue({
      data: [
        { code: "report.read", held: true },
      ],
      isLoading: false,
    } as unknown as never);

    render(<SidebarContent pathname="/dashboard" />);

    // Dashboard always visible
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    // Pengaturan hidden (no permissions)
    expect(screen.queryByText("Pengaturan")).not.toBeInTheDocument();
    // Operasional hidden (no academic_ops module)
    expect(screen.queryByText("Operasional")).not.toBeInTheDocument();
    // Akademik group visible (Nilai hidden but Rapor visible → group has visible child)
    expect(screen.getByText("Akademik")).toBeInTheDocument();
  });

  it("shows only Dashboard and Operasional for ops-only (academic_ops module, no other permissions)", () => {
    vi.mocked(useTenantMe).mockReturnValue({
      data: {
        tenant_id: "t1",
        school_name: "Test",
        modules: modulesFrom(["academic_ops"]),
      },
      isLoading: false,
    } as unknown as never);
    vi.mocked(useTenantPermissions).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as never);

    render(<SidebarContent pathname="/dashboard" />);

    // Dashboard always visible
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    // Pengaturan hidden (no permissions)
    expect(screen.queryByText("Pengaturan")).not.toBeInTheDocument();
    // Operasional visible
    expect(screen.getByText("Operasional")).toBeInTheDocument();
    // Akademik hidden (grading module not enabled, so no children visible)
    expect(screen.queryByText("Akademik")).not.toBeInTheDocument();
  });

  it("hides Akademik group when both Nilai and Rapor are invisible", () => {
    vi.mocked(useTenantMe).mockReturnValue({
      data: {
        tenant_id: "t1",
        school_name: "Test",
        modules: modulesFrom(["academic_ops", "grading"]),
      },
      isLoading: false,
    } as unknown as never);
    vi.mocked(useTenantPermissions).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as never);

    render(<SidebarContent pathname="/dashboard" />);

    // Pengaturan heading hidden when no children visible
    expect(screen.queryByText("Pengaturan")).not.toBeInTheDocument();
    // Operasional still visible
    expect(screen.getByText("Operasional")).toBeInTheDocument();
    // Akademik hidden (grading module enabled but no grade.read or report.read)
    expect(screen.queryByText("Akademik")).not.toBeInTheDocument();
  });
});
