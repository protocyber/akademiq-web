/** @vitest-environment jsdom */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const levels = vi.hoisted(() => ({ data: [] as unknown[] }));

vi.mock("@/hooks/use-academic-scope", () => ({
  useAcademicScope: () => ({ yearId: "11111111-1111-4111-8111-111111111111" }),
}));
vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useGradeLevels: () => ({ data: levels.data, isLoading: false }),
}));
vi.mock("@/lib/query/queries/use-academic-ops", () => ({
  useTeachers: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/lib/query/mutations/use-academic-ops", () => {
  const m = () => ({ mutateAsync: vi.fn(), isPending: false });
  return { useCreateHomeroom: m, useUpdateHomeroom: m };
});

import { HomeroomDialog } from "@/components/features/academic-ops/homerooms-screen";

describe("HomeroomDialog grade level", () => {
  it("points to grade level settings when the year has none", () => {
    levels.data = [];
    render(<HomeroomDialog canManage upgradeMessage="" open onOpenChange={() => undefined} />);
    expect(screen.getByText("Tahun ajaran ini belum punya tingkat kelas.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Atur tingkat kelas" })).toHaveAttribute(
      "href",
      "/settings/academic/grade-levels",
    );
  });

  it("shows the current text of an unlinked homeroom", () => {
    levels.data = [
      { grade_level_id: "22222222-2222-4222-8222-222222222222", label: "Kelas X", code: "X", ordinal: 1 },
    ];
    render(
      <HomeroomDialog
        canManage
        upgradeMessage=""
        open
        onOpenChange={() => undefined}
        homeroom={{
          homeroom_id: "33333333-3333-4333-8333-333333333333",
          name: "X-1",
          grade_level: "10",
          grade_level_id: null,
          ordinal: null,
          capacity: 32,
          academic_year_id: "11111111-1111-4111-8111-111111111111",
          enrolled_count: 0,
          homeroom_teacher_id: null,
        }}
      />,
    );
    expect(screen.getByText("Saat ini: 10 (belum tertaut)")).toBeInTheDocument();
  });
});
