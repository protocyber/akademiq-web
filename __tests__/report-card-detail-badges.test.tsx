/** @vitest-environment jsdom */
import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { ReportCardDetailBody } from "@/components/features/grading/report-card-detail-body";

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/query/mutations/use-grading", () => ({
  useTransitionReportCard: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useSubjectsForYear: () => ({
    data: [
      { subject_id: "sub-1", name: "Iqro", subject_group: { subject_group_id: "g1", name: "A", position: 1 } },
      { subject_id: "sub-2", name: "Tahfidz", subject_group: { subject_group_id: "g1", name: "A", position: 1 } },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/lib/query/queries/use-academic-ops", () => ({
  useHomeroomRoster: () => ({ data: [{ student_id: "s1", full_name: "Andi" }], isLoading: false }),
  useTeachers: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/query/queries/use-grading", () => ({
  useReportCardDetail: () => ({
    data: {
      report_card: {
        report_card_id: "card-s1",
        student_id: "s1",
        academic_year_id: "year-1",
        homeroom_id: "hr-1",
        report_type_id: "rt-1",
        status: "Draft",
        summary: {
          subjects: [
            { subject_id: "sub-1", final_score: 90, passed: true },
            { subject_id: "sub-2", final_score: 0, passed: false },
          ],
        },
      },
      grades: [],
      subject_scores: [
        { report_card_id: "card-s1", subject_id: "sub-1", final_score: 90, computed_at: "" },
        { report_card_id: "card-s1", subject_id: "sub-2", final_score: 0, computed_at: "" },
      ],
      approvals: [],
    },
    isLoading: false,
  }),
}));

describe("ReportCardDetailBody score badges", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows a destructive 'periksa input' badge next to a zero score and keeps the status", () => {
    render(<ReportCardDetailBody reportCardId="card-s1" />);

    expect(screen.getByText(/periksa input/i)).toBeInTheDocument();
    expect(screen.getByText("Remedial")).toBeInTheDocument();
  });

  it("shows 'Lulus' for a passing score", () => {
    render(<ReportCardDetailBody reportCardId="card-s1" />);

    expect(screen.getByText("Lulus")).toBeInTheDocument();
  });
});
