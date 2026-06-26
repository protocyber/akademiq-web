/** @vitest-environment jsdom */
import * as React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import ReportCardsPage from "@/app/grading/report-cards/page";
import { BULK_PRINT_STORAGE_KEY } from "@/lib/report-cards/bulk-print";

vi.mock("@/components/features/auth-guard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/sidebar-layout", () => ({
  SidebarLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("report_type_id=rt-1&homeroom_id=hr-1"),
}));

vi.mock("@/hooks/use-academic-scope", () => ({
  useAcademicScope: () => ({ yearId: "year-1", curriculumId: null, termId: null }),
}));

vi.mock("@/lib/query/queries/use-tenant-me", () => ({
  useTenantMe: () => ({ data: { tenant_id: "t1", school_name: "S" }, isLoading: false }),
}));

vi.mock("@/lib/query/queries/use-me", () => ({
  useMe: () => ({ data: { full_name: "U", email: "u@u.com" }, isLoading: false }),
}));

vi.mock("@/lib/query/mutations/use-logout", () => ({
  useLogout: () => ({ isPending: false }),
}));

vi.mock("@/lib/query/mutations/use-grading", () => ({
  useBulkTransitionReportCards: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGenerateReportCards: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const roster = [
  { student_id: "s1", full_name: "Andi Siswa" },
  { student_id: "s2", full_name: "Budi Tanpa Rapor" },
];

const cards = [
  {
    report_card_id: "card-s1",
    student_id: "s1",
    academic_year_id: "year-1",
    homeroom_id: "hr-1",
    report_type_id: "rt-1",
    status: "Draft" as const,
    summary: {
      subjects: [
        { subject_id: "sub-1", final_score: 90, passed: true },
        { subject_id: "sub-2", final_score: 0, passed: false },
      ],
      average_score: 85,
    },
  },
];

const assignments = [
  { assignment_id: "a1", teacher_id: "t1", subject_id: "sub-1", homeroom_id: "hr-1", academic_year_id: "year-1", created_at: "" },
  { assignment_id: "a2", teacher_id: "t1", subject_id: "sub-2", homeroom_id: "hr-1", academic_year_id: "year-1", created_at: "" },
];

const subjects = [
  { subject_id: "sub-1", name: "Iqro", subject_group: { subject_group_id: "g1", name: "A", position: 1 } },
  { subject_id: "sub-2", name: "Tahfidz", subject_group: { subject_group_id: "g1", name: "A", position: 1 } },
];

vi.mock("@/lib/query/queries/use-academic-ops", () => ({
  useHomerooms: () => ({ data: [{ homeroom_id: "hr-1", name: "Kelas A" }], isLoading: false }),
  useHomeroomRoster: () => ({ data: roster, isLoading: false }),
  useTeachingAssignments: () => ({ data: assignments, isLoading: false }),
}));

vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useSubjectsForYear: () => ({ data: subjects, isLoading: false }),
}));

vi.mock("@/lib/query/queries/use-grading", () => ({
  useReportTypes: () => ({ data: [{ report_type_id: "rt-1", name: "Rapor" }], isLoading: false }),
  useReportCards: () => ({ data: cards, isLoading: false }),
}));

function rowFor(name: string) {
  const cell = screen.getByText(name);
  return cell.closest("tr") as HTMLElement;
}

describe("Report cards board", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.open = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows every roster student with progress and average", () => {
    render(<ReportCardsPage />);

    const andi = rowFor("Andi Siswa");
    // Y=2 assigned subjects, card scores both → 2/2 (complete)
    expect(within(andi).getByText("2/2")).toBeInTheDocument();
    expect(within(andi).getByText("85.0")).toBeInTheDocument();

    const budi = rowFor("Budi Tanpa Rapor");
    // No card → 0/2 and an em-dash average
    expect(within(budi).getByText("0/2")).toBeInTheDocument();
    expect(within(budi).getByText("—")).toBeInTheDocument();
  });

  it("warns when some students have no report card", () => {
    render(<ReportCardsPage />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText(/belum punya rapor/i)).toBeInTheDocument();
    expect(within(alert).getByText(/1 siswa/i)).toBeInTheDocument();
  });

  it("disables Detail for a student without a card", () => {
    render(<ReportCardsPage />);

    const andi = rowFor("Andi Siswa");
    const budi = rowFor("Budi Tanpa Rapor");

    expect(within(andi).getByRole("button", { name: /detail/i })).not.toBeDisabled();
    expect(within(budi).getByRole("button", { name: /detail/i })).toBeDisabled();
  });

  it("expands into per-subject columns across all rows and collapses back", () => {
    render(<ReportCardsPage />);

    expect(screen.queryByRole("columnheader", { name: "Iqro" })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /rekapitulasi nilai/i })[0]);

    expect(screen.getByRole("columnheader", { name: "Iqro" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tahfidz" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /tutup rekapitulasi/i })[0]);

    expect(screen.queryByRole("columnheader", { name: "Iqro" })).not.toBeInTheDocument();
  });

  it("highlights below-KKM scores (including zero) in red on the recap columns", () => {
    render(<ReportCardsPage />);

    fireEvent.click(screen.getAllByRole("button", { name: /rekapitulasi nilai/i })[0]);

    const andi = rowFor("Andi Siswa");
    // sub-2 scored 0 (below KKM) → red chip with 0.0
    const zeroChip = within(andi).getByText("0.0");
    expect(zeroChip).toBeInTheDocument();
    expect(zeroChip).toHaveClass("bg-red-100", "text-red-700");
  });

  it("writes checked IDs to sessionStorage and opens the batch print route", () => {
    render(<ReportCardsPage />);

    // Select the student that has a card.
    const andi = rowFor("Andi Siswa");
    fireEvent.click(within(andi).getByRole("checkbox"));

    fireEvent.click(screen.getByRole("button", { name: /cetak terpilih/i }));

    expect(window.open).toHaveBeenCalledWith(
      "/grading/report-cards/print?batch=true",
      "_blank",
      "noopener,noreferrer",
    );
    expect(window.localStorage.getItem(BULK_PRINT_STORAGE_KEY)).toBe(
      JSON.stringify(["card-s1"]),
    );
  });
});
