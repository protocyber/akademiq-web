/** @vitest-environment jsdom */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  tenantMe: { data: undefined as unknown, isLoading: true },
  permissions: { data: undefined as unknown, isLoading: true },
}));

vi.mock("@/lib/query/queries/use-tenant-me", () => ({
  useTenantMe: () => m.tenantMe,
}));
vi.mock("@/lib/query/queries/use-tenant-roles", () => ({
  useTenantPermissions: () => m.permissions,
}));
vi.mock("@/lib/query/queries/use-me", () => ({
  useMe: () => ({ data: undefined, isLoading: true }),
}));
vi.mock("@/hooks/use-academic-scope", () => ({
  useAcademicScope: () => ({
    yearId: null,
    curriculumId: null,
    termId: null,
    setYearId: vi.fn(),
    setCurriculumId: vi.fn(),
    setTermId: vi.fn(),
    hasNoActiveTerm: false,
    isResolving: false,
  }),
}));
vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useAcademicYears: () => ({ data: [], isLoading: false }),
  useTerms: () => ({ data: [], isLoading: false }),
  useCurriculumVersions: () => ({ data: [], isLoading: false }),
}));

import { SidebarContent } from "./sidebar-layout";

// A principal: grading + promotion approval only, no admin permissions.
const principalModules = {
  modules: [
    { feature_code: "academic_ops", enabled: true },
    { feature_code: "grading", enabled: true },
    { feature_code: "academic_config", enabled: true },
  ],
};
const principalPerms = [
  { code: "report.read", held: true },
  { code: "promotion.approve", held: true },
  { code: "user.read", held: false },
  { code: "academic.config.write", held: false },
];

const links = () => screen.queryAllByRole("link").map((a) => a.textContent);

beforeEach(() => {
  m.tenantMe = { data: undefined, isLoading: true };
  m.permissions = { data: undefined, isLoading: true };
});

describe("SidebarContent menu visibility", () => {
  it("shows no permission-gated menu while modules and permissions load", () => {
    render(<SidebarContent pathname="/settings/users" />);
    // Only the always-visible Dashboard; no gated link may flash before the filter applies.
    expect(links()).toEqual(["Dashboard"]);
    expect(screen.queryByText("Pengaturan")).toBeNull();
    expect(screen.getByTestId("sidebar-nav-loading")).toBeTruthy();
  });

  it("still waits while only one of the two queries has loaded", () => {
    m.tenantMe = { data: principalModules, isLoading: false };
    render(<SidebarContent pathname="/dashboard" />);
    expect(links()).toEqual(["Dashboard"]);
  });

  it("shows only the menus the principal may use once loaded", () => {
    m.tenantMe = { data: principalModules, isLoading: false };
    m.permissions = { data: principalPerms, isLoading: false };
    render(<SidebarContent pathname="/promotion" />);
    expect(screen.queryByTestId("sidebar-nav-loading")).toBeNull();
    expect(links()).toEqual(expect.arrayContaining(["Dashboard", "Kenaikan Kelas"]));
    expect(links()).toEqual(["Dashboard", "Rapor", "Kenaikan Kelas"]);
  });
});
