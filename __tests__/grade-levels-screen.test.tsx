/** @vitest-environment jsdom */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GradeLevelsScreen } from "@/app/settings/academic/grade-levels/page";
import { useAcademicScope } from "@/hooks/use-academic-scope";
import { useGradeLevels } from "@/lib/query/queries/use-academic-config";
import {
  useAddGradeLevel,
  useDeleteGradeLevel,
  useReorderGradeLevels,
  useUpdateGradeLevel,
} from "@/lib/query/mutations/use-academic-config";

vi.mock("@/hooks/use-academic-scope", () => ({
  useAcademicScope: vi.fn(),
}));

vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useGradeLevels: vi.fn(),
}));

vi.mock("@/lib/query/mutations/use-academic-config", () => ({
  useAddGradeLevel: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateGradeLevel: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useReorderGradeLevels: vi.fn(),
  useDeleteGradeLevel: vi.fn(),
}));

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
];

describe("GradeLevelsScreen — FIX 1: pending guards", () => {
  it("disables the delete confirm while the delete mutation is pending", async () => {
    vi.mocked(useAcademicScope).mockReturnValue({
      yearId: "y",
      isResolving: false,
    } as unknown as never);
    vi.mocked(useGradeLevels).mockReturnValue({
      data: levels,
      isLoading: false,
    } as unknown as never);
    vi.mocked(useReorderGradeLevels).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);
    vi.mocked(useDeleteGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as unknown as never);
    vi.mocked(useAddGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);
    vi.mocked(useUpdateGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);

    render(<GradeLevelsScreen canEdit />);

    // Trigger the delete dialog via the row action, then assert it is gated.
    await userEvent.click(screen.getByRole("button", { name: /menu kelas x/i }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /hapus/i }));

    expect(await screen.findByRole("button", { name: /hapus/i })).toBeDisabled();
  });

  it("disables move buttons while the reorder mutation is pending", () => {
    vi.mocked(useAcademicScope).mockReturnValue({
      yearId: "y",
      isResolving: false,
    } as unknown as never);
    vi.mocked(useGradeLevels).mockReturnValue({
      data: levels,
      isLoading: false,
    } as unknown as never);
    vi.mocked(useReorderGradeLevels).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as unknown as never);
    vi.mocked(useDeleteGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);
    vi.mocked(useAddGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);
    vi.mocked(useUpdateGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);

    render(<GradeLevelsScreen canEdit />);

    expect(screen.getByRole("button", { name: /turunkan kelas x/i })).toBeDisabled();
  });
});

describe("GradeLevelsScreen — FIX 3: isResolving loading state", () => {
  it("shows a skeleton instead of the empty state while the academic scope is resolving", () => {
    vi.mocked(useAcademicScope).mockReturnValue({
      yearId: null,
      isResolving: true,
    } as unknown as never);
    vi.mocked(useGradeLevels).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as never);
    vi.mocked(useReorderGradeLevels).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);
    vi.mocked(useDeleteGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);
    vi.mocked(useAddGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);
    vi.mocked(useUpdateGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);

    render(<GradeLevelsScreen canEdit />);

    expect(screen.queryByText(/pilih tahun ajaran/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/belum ada tingkat kelas/i)).not.toBeInTheDocument();
  });

  it("shows the no-year-selected state once resolved with no year", () => {
    vi.mocked(useAcademicScope).mockReturnValue({
      yearId: null,
      isResolving: false,
    } as unknown as never);
    vi.mocked(useGradeLevels).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as never);
    vi.mocked(useReorderGradeLevels).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);
    vi.mocked(useDeleteGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);
    vi.mocked(useAddGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);
    vi.mocked(useUpdateGradeLevel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as never);

    render(<GradeLevelsScreen canEdit />);

    expect(screen.getByText(/pilih tahun ajaran/i)).toBeInTheDocument();
  });
});
