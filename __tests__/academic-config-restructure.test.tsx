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

describe("Semester edit form tabs (Info / Rapor)", () => {
  it("renders exactly two tabs", () => {
    render(
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="rapor">Rapor</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "Info" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rapor" })).toBeInTheDocument();
  });
});
