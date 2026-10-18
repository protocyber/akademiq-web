/** @vitest-environment jsdom */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const runs = vi.hoisted(() => ({ data: [] as unknown[] }));
const YEAR = "11111111-1111-4111-8111-111111111111";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/use-academic-scope", () => ({ useAcademicScope: () => ({ yearId: YEAR }) }));
vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useAcademicYears: () => ({ data: [{ academic_year_id: YEAR, name: "2025/2026", status: "Active" }], isLoading: false }),
}));
vi.mock("@/lib/query/queries/use-promotion", () => ({
  usePromotionRuns: () => ({ data: runs.data, isLoading: false, error: null }),
}));
vi.mock("@/lib/query/mutations/use-promotion", () => ({
  useCreatePromotionRun: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReevaluatePromotionRun: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { RunsScreen } from "@/components/features/promotion/runs-screen";

function run(status: string, id: string) {
  return {
    run_id: id,
    academic_year_id: YEAR,
    status,
    created_at: "2026-06-01T00:00:00Z",
    created_by: "u",
    approved_by: null,
    executed_at: null,
  };
}

describe("RunsScreen", () => {
  it("offers to create a run when the year has no open run", () => {
    runs.data = [run("executed", "r-old")];
    render(<RunsScreen canManage />);
    expect(screen.getByRole("button", { name: "Buat evaluasi" })).toBeInTheDocument();
  });

  it("links to the open run instead of offering a second one", () => {
    runs.data = [run("submitted", "r-open")];
    render(<RunsScreen canManage />);
    expect(screen.queryByRole("button", { name: "Buat evaluasi" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka evaluasi berjalan" })).toHaveAttribute("href", "/promotion/r-open");
  });

  it("never offers create without promotion.manage", () => {
    runs.data = [];
    render(<RunsScreen canManage={false} />);
    expect(screen.queryByRole("button", { name: "Buat evaluasi" })).not.toBeInTheDocument();
  });
});
