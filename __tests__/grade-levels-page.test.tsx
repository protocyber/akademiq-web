import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { GradeLevelsTable } from "@/app/settings/academic/grade-levels/page";

const levels = [
  {
    grade_level_id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "t",
    academic_year_id: "y",
    code: "X",
    label: "Kelas X",
    ordinal: 1,
    is_final: false,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  },
  {
    grade_level_id: "22222222-2222-4222-8222-222222222222",
    tenant_id: "t",
    academic_year_id: "y",
    code: "XII",
    label: "Kelas XII",
    ordinal: 2,
    is_final: true,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  },
];

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("GradeLevelsTable", () => {
  it("lists grade levels in ordinal order", () => {
    wrap(
      <GradeLevelsTable
        levels={levels}
        canEdit
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1); // skip header
    expect(rows[0]).toHaveTextContent("X");
    expect(rows[1]).toHaveTextContent("XII");
  });

  it("marks the final grade level", () => {
    wrap(
      <GradeLevelsTable
        levels={levels}
        canEdit
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    expect(screen.getByText("Tingkat akhir")).toBeInTheDocument();
  });

  it("moving a level down emits the reordered id list", async () => {
    const onReorder = vi.fn();
    wrap(
      <GradeLevelsTable
        levels={levels}
        canEdit
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReorder={onReorder}
      />,
    );
    // Exact string match: the regex /turunkan kelas x/i would also match
    // "Turunkan Kelas XII" (substring), causing a multi-element error.
    await userEvent.click(screen.getByRole("button", { name: "Turunkan Kelas X" }));
    expect(onReorder).toHaveBeenCalledWith([
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("hides mutating controls when the user cannot edit", () => {
    wrap(
      <GradeLevelsTable
        levels={levels}
        canEdit={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /turunkan/i })).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no grade levels", () => {
    wrap(
      <GradeLevelsTable
        levels={[]}
        canEdit
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    expect(screen.getByText(/belum ada tingkat kelas/i)).toBeInTheDocument();
  });
});
