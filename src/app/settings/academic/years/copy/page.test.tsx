/** @vitest-environment jsdom */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ roles: [] as string[], perms: [] as string[] }));

vi.mock("@/lib/auth/access-claims", () => ({
  hasAccessRole: (c: string) => m.roles.includes(c),
  hasAccessPerm: (c: string) => m.perms.includes(c),
}));
vi.mock("@/components/features/academic-config/academic-settings", () => ({
  AcademicSettingsPage: ({ children }: { children: (ctx: unknown) => React.ReactNode }) => (
    <div>{children({ canManageAcademicConfig: true })}</div>
  ),
}));
vi.mock("@/components/features/academic-config/year-copy/year-copy-wizard", () => ({
  YearCopyWizard: () => <div data-testid="wizard" />,
}));

import NewYearCopyPage from "./page";

beforeEach(() => {
  m.roles = [];
  m.perms = [];
});

describe("NewYearCopyPage", () => {
  it("shows an admin-only alert and no wizard for non-admins", () => {
    render(<NewYearCopyPage />);
    expect(screen.getByText("Hanya admin sekolah yang dapat menyalin data tahun ajaran.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Kembali/ }).getAttribute("href")).toBe("/settings/academic/years");
    expect(screen.queryByTestId("wizard")).toBeNull();
  });

  it("mounts the wizard for school admins", () => {
    m.roles = ["tenant_admin"];
    m.perms = ["academic.config.write"];
    render(<NewYearCopyPage />);
    expect(screen.getByTestId("wizard")).toBeTruthy();
  });
});
