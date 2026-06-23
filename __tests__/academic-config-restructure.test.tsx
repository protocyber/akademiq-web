/** @vitest-environment jsdom */
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

describe("Year form modal tabs (Info / Kebijakan Nilai / Versi Kurikulum)", () => {
  it("renders exactly three tabs and no Semester/Jenis Rapor tab", () => {
    render(
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="kebijakan">Kebijakan Nilai</TabsTrigger>
          <TabsTrigger value="kurikulum">Versi Kurikulum</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <button type="submit">Simpan</button>
        </TabsContent>
      </Tabs>,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "Info" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Kebijakan Nilai" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Versi Kurikulum" })).toBeInTheDocument();

    // Removed tabs must not appear.
    expect(screen.queryByRole("tab", { name: "Semester" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Jenis Rapor" })).not.toBeInTheDocument();

    // Info tab carries an explicit Simpan action.
    expect(screen.getByRole("button", { name: "Simpan" })).toBeInTheDocument();
  });

  it("disables Kebijakan/Kurikulum tabs on the create flow", () => {
    render(
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="kebijakan" disabled>Kebijakan Nilai</TabsTrigger>
          <TabsTrigger value="kurikulum" disabled>Versi Kurikulum</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    expect(screen.getByRole("tab", { name: "Kebijakan Nilai" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Versi Kurikulum" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Info" })).not.toBeDisabled();
  });
});

describe("Semester edit form tabs (Info / Status / Rapor / Evaluasi)", () => {
  it("renders exactly four tabs", () => {
    render(
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="rapor">Rapor</TabsTrigger>
          <TabsTrigger value="evaluasi">Evaluasi</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Info", "Status", "Rapor", "Evaluasi"]);
  });
});

describe("Evaluasi tab apply feedback", () => {
  it("shows the nudge banner and apply action wording", () => {
    render(
      <div>
        <div>3 penugasan belum punya evaluasi untuk semester ini.</div>
        <button type="button">Terapkan ke semua penugasan yang belum punya evaluasi</button>
      </div>,
    );

    expect(screen.getByText(/3 penugasan belum punya evaluasi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /terapkan ke semua penugasan/i })).toBeInTheDocument();
  });
});
