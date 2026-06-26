/** @vitest-environment jsdom */
import * as React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import BatchPrintReportCardsPage from "@/app/grading/report-cards/print/page";
import { BULK_PRINT_STORAGE_KEY } from "@/lib/report-cards/bulk-print";

vi.mock("@/components/features/auth-guard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("batch=true"),
}));

vi.mock("@/components/features/grading/report-card-print-document", () => ({
  ReportCardPrintStyles: () => null,
  ReportCardPrintDocument: ({ reportCardId, onReady }: { reportCardId: string; onReady?: () => void }) => {
    React.useEffect(() => {
      onReady?.();
    }, [onReady]);
    return <div>Print {reportCardId}</div>;
  },
}));

describe("bulk print route", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.print = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps stored IDs readable under StrictMode-style double effects", async () => {
    window.localStorage.setItem(BULK_PRINT_STORAGE_KEY, JSON.stringify(["card-1", "card-2"]));

    render(
      <React.StrictMode>
        <BatchPrintReportCardsPage />
      </React.StrictMode>,
    );

    expect(await screen.findByText("Print card-1")).toBeInTheDocument();
    expect(screen.getByText("Print card-2")).toBeInTheDocument();
    expect(window.localStorage.getItem(BULK_PRINT_STORAGE_KEY)).toBe(JSON.stringify(["card-1", "card-2"]));
  });
});
