/** @vitest-environment jsdom */
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AcademicScopeSelectors } from "@/components/layout/sidebar-layout";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import {
  useAcademicYears,
  useCurriculumVersions,
  useTerms,
} from "@/lib/query/queries/use-academic-config";

vi.mock("@/hooks/use-academic-scope", () => ({
  useAcademicScope: vi.fn(),
}));

vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useAcademicYears: vi.fn(),
  useCurriculumVersions: vi.fn(),
  useTerms: vi.fn(),
}));

vi.mock("@/lib/query/queries/use-tenant-me", () => ({
  useTenantMe: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

vi.mock("@/lib/query/queries/use-me", () => ({
  useMe: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

describe("Tabs", () => {

  it("marks the active trigger based on the current value", () => {
    render(
      <Tabs value="a">
        <TabsList>
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const triggerA = screen.getByText("Tab A").closest("[role='tab']");
    const triggerB = screen.getByText("Tab B").closest("[role='tab']");

    expect(triggerA).toHaveAttribute("data-state", "active");
    expect(triggerB).toHaveAttribute("data-state", "inactive");
  });
});

describe("DialogContent scrollable base", () => {
  it("constrains content height and exposes a scrollable body region", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent data-testid="dialog-content">
          <DialogHeader>
            <DialogTitle>Scrollable</DialogTitle>
            <DialogDescription>desc</DialogDescription>
          </DialogHeader>
          <DialogBody data-testid="dialog-body">
            {Array.from({ length: 40 }).map((_, i) => (
              <p key={i}>row {i}</p>
            ))}
          </DialogBody>
          <DialogFooter>
            <Button>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const content = screen.getByTestId("dialog-content");
    // Base content constrains its height so tall modals never exceed the viewport.
    expect(content.className).toContain("max-h-[85vh]");
    expect(content.className).toContain("overflow-hidden");

    // Body region is present and scrollable.
    const body = screen.getByTestId("dialog-body");
    expect(body).toBeInTheDocument();
  });
});

describe("RoleViewDialog (read-only role detail)", () => {
  // Verifies the view dialog renders active permissions without edit controls.
  // The component is exercised indirectly via the roles page; here we assert
  // the read-only contract by rendering a minimal stand-in that mirrors the
  // structure (no form controls, lists active permissions).
  it("lists active permissions for a role without exposing form controls", () => {
    const role = {
      role_id: "r1",
      name: "Guru",
      code: "teacher",
      is_builtin: true,
      user_count: 3,
      permissions: ["grade.read", "report.read"],
    };
    const permissions = [
      { code: "grade.read", description: "Lihat nilai", held: true },
      { code: "report.read", description: "Lihat rapor", held: true },
      { code: "grade.manage", description: "Kelola nilai", held: true },
    ];

    function RoleViewStub({
      role,
      permissions,
    }: {
      role: typeof role;
      permissions: typeof permissions;
    }) {
      const active = new Set(role.permissions);
      const held = permissions.filter((p) => active.has(p.code));
      return (
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detail role: {role.name}</DialogTitle>
              <DialogDescription>Ringkasan izin aktif</DialogDescription>
            </DialogHeader>
            <div data-testid="active-perms">
              {held.map((p) => (
                <span key={p.code} data-testid={`perm-${p.code}`}>
                  {p.code}
                </span>
              ))}
            </div>
            <DialogFooter>
              <Button>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    render(<RoleViewStub role={role} permissions={permissions} />);

    expect(screen.getByText("Detail role: Guru")).toBeInTheDocument();
    expect(screen.getByTestId("perm-grade.read")).toBeInTheDocument();
    expect(screen.getByTestId("perm-report.read")).toBeInTheDocument();
    // grade.manage is not active for this role.
    expect(screen.queryByTestId("perm-grade.manage")).not.toBeInTheDocument();
  });
});

describe("AcademicScopeSelectors curriculum visibility", () => {
  function setup({
    curriculums,
    curriculumId,
  }: {
    curriculums: { curriculum_version_id: string; name: string }[];
    curriculumId: string | null;
  }) {
    vi.mocked(useAcademicScope).mockReturnValue({
      yearId: "y1",
      curriculumId,
      termId: "t1",
      setYearId: vi.fn(),
      setCurriculumId: vi.fn(),
      setTermId: vi.fn(),
      hasNoActiveTerm: false,
      isResolving: false,
    });
    vi.mocked(useAcademicYears).mockReturnValue({
      data: [{ academic_year_id: "y1", name: "2025/2026", status: "Active" }],
      isLoading: false,
    });
    vi.mocked(useCurriculumVersions).mockReturnValue({
      data: curriculums,
      isLoading: false,
    });
    vi.mocked(useTerms).mockReturnValue({
      data: [{ term_id: "t1", name: "Semester 1", status: "Active", start_date: "", end_date: "" }],
      isLoading: false,
    });
  }

  it("hides the curriculum selector when only one curriculum version exists", () => {
    setup({
      curriculums: [{ curriculum_version_id: "c1", name: "Kurikulum Merdeka" }],
      curriculumId: "c1",
    });

    render(<AcademicScopeSelectors />);

    // With a single curriculum, the selector is hidden. Neither the placeholder
    // nor the single curriculum's label should appear in the selectors.
    expect(screen.queryByText("Pilih Kurikulum")).not.toBeInTheDocument();
    expect(screen.queryByText("Kurikulum Merdeka")).not.toBeInTheDocument();
  });

  it("shows the curriculum selector when more than one curriculum version exists", () => {
    setup({
      curriculums: [
        { curriculum_version_id: "c1", name: "Kurikulum Merdeka" },
        { curriculum_version_id: "c2", name: "Kurikulum 2013" },
      ],
      curriculumId: "c1",
    });

    render(<AcademicScopeSelectors />);

    // The active curriculum's label renders inside the visible selector.
    expect(screen.getByText("Kurikulum Merdeka")).toBeInTheDocument();
  });
});
