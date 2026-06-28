/** @vitest-environment jsdom */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudentsScreen } from "@/components/features/academic-ops/students-screen";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  useSearchParams: () => nav.searchParams,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/query/mutations/use-academic-ops", () => {
  const m = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    useArchiveStudent: m,
    useBulkDeleteStudents: m,
    useCreateStudent: m,
    useDeleteStudent: m,
    useUpdateStudent: m,
    useLinkStudentAccount: m,
    useUnlinkStudentAccount: m,
    useLinkGuardian: m,
    useUnlinkGuardian: m,
    useUploadMedia: m,
    useImportStudents: m,
    useImportTeachers: m,
  };
});

vi.mock("@/lib/query/queries/use-academic-ops", () => ({
  useStudentsTable: () => ({
    data: { data: [], meta: { page: 1, page_size: 25, total: 0 } },
    isLoading: false,
    error: null,
  }),
  useStudentEnrollmentsByYear: () => ({ data: [], isLoading: false }),
  useStudentGuardians: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useAcademicYears: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/query/queries/use-tenant-users", () => ({
  useTenantUsers: () => ({ data: { data: [] }, isLoading: false, isFetching: false }),
}));

describe("StudentsScreen — URL search params do not stick across navigation", () => {
  beforeEach(() => {
    nav.replace.mockReset();
    nav.searchParams = new URLSearchParams();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not write back a stale search term after navigating to a clean URL", () => {
    // Mount with a search filter applied in the URL (e.g. ?search=budi).
    nav.searchParams = new URLSearchParams("search=budi");
    const { rerender } = render(<StudentsScreen canManage upgradeMessage="" />);

    // Simulate sidebar navigation back to a clean URL: searchParams becomes empty.
    nav.searchParams = new URLSearchParams();
    rerender(<StudentsScreen canManage upgradeMessage="" />);

    // Flush any pending debounce timers (> 350ms).
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // The screen must NOT push the stale "budi" search back into the URL.
    const wroteStaleSearch = nav.replace.mock.calls.some(([url]) =>
      typeof url === "string" && url.includes("search=budi"),
    );
    expect(wroteStaleSearch).toBe(false);
  });

  it("writes the typed search term to the URL after debounce", () => {
    nav.searchParams = new URLSearchParams();
    render(<StudentsScreen canManage upgradeMessage="" />);

    const input = screen.getByPlaceholderText("Cari nama atau NIS");
    fireEvent.change(input, { target: { value: "andi" } });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const wroteSearch = nav.replace.mock.calls.some(([url]) =>
      typeof url === "string" && url.includes("search=andi"),
    );
    expect(wroteSearch).toBe(true);
  });
});
