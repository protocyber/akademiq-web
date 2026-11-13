/** @vitest-environment jsdom */
import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiHttpError } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors/messages";
import { makeQueryClient } from "@/lib/query/client";
import type { CopyRun, CopyStepResult } from "@/lib/query/queries/use-year-copy";

const m = vi.hoisted(() => ({
  push: vi.fn(),
  createYear: vi.fn(),
  startRun: vi.fn(),
  updateRun: vi.fn(),
  copyConfig: vi.fn(),
  copyOps: vi.fn(),
  copyGrading: vi.fn(),
  runCopy: vi.fn(),
  currentRun: { data: null as unknown, refetch: vi.fn() },
  years: [] as unknown[],
  terms: [] as unknown[],
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("@/lib/query/mutations/use-academic-config", () => ({
  useCreateAcademicYear: () => ({ mutateAsync: m.createYear, isPending: false }),
}));
vi.mock("@/lib/query/mutations/use-year-copy", () => ({
  copyConfig: m.copyConfig,
  copyOps: m.copyOps,
  copyGrading: m.copyGrading,
  useStartCopyRun: () => ({ mutateAsync: m.startRun, isPending: false }),
  useUpdateCopyRun: () => ({ mutateAsync: m.updateRun, isPending: false }),
}));
vi.mock("@/lib/query/queries/use-academic-config", () => ({
  useAcademicYears: () => ({ data: m.years, isLoading: false }),
  useTerms: (yearId?: string) => ({ data: yearId ? m.terms : undefined, isLoading: false }),
}));
vi.mock("@/lib/query/queries/use-year-copy", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/query/queries/use-year-copy")>()),
  useCurrentCopyRun: () => m.currentRun,
}));
vi.mock("./run-copy", () => ({ runCopy: m.runCopy }));

import { YearCopyWizard } from "./year-copy-wizard";

const SRC = "11111111-1111-4111-8111-111111111111";
const OLD = "22222222-2222-4222-8222-222222222222";
const TGT = "33333333-3333-4333-8333-333333333333";

const year = (id: string, name: string, start: string, status = "Draft") => ({
  academic_year_id: id,
  tenant_id: "t",
  name,
  start_date: start,
  end_date: start.replace(/^\d{4}/, (y) => String(Number(y) + 1)),
  status,
});

function step(rows: [string, number, number][]): CopyStepResult {
  return {
    results: rows.map(([item, source, target_existing]) => ({
      item: item as never,
      source,
      target_existing,
      copied: 0,
      skipped: 0,
    })),
  };
}

function run(over: Partial<CopyRun> = {}): CopyRun {
  return {
    copy_run_id: "run-1",
    source_academic_year_id: SRC,
    target_academic_year_id: TGT,
    items: ["terms", "grade_levels", "report_types"],
    term_dates: null,
    status: "in_progress",
    id_map: null,
    config_result: null,
    ops_result: null,
    grading_result: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function renderWizard(props: React.ComponentProps<typeof YearCopyWizard> = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <YearCopyWizard {...props} />
    </QueryClientProvider>,
  );
}

const next = () => fireEvent.click(screen.getByRole("button", { name: "Lanjut →" }));
const current = () => document.querySelector('[aria-current="step"]')?.textContent ?? "";

beforeEach(() => {
  vi.clearAllMocks();
  m.years = [
    year(OLD, "2023/2024", "2023-07-15", "Closed"),
    year(SRC, "2025/2026", "2025-07-15", "Active"),
    year(TGT, "2026/2027", "2026-07-15"),
  ];
  m.terms = [
    { term_id: "s1", name: "Semester 1", start_date: "2025-07-15", end_date: "2025-12-20" },
    { term_id: "s2", name: "Semester 2", start_date: "2026-01-05", end_date: "2026-06-20" },
  ];
  m.currentRun = { data: null, refetch: vi.fn() };
  m.copyConfig.mockResolvedValue(
    step([["terms", 2, 0], ["grade_levels", 6, 0], ["classes", 6, 0], ["curriculum", 1, 0], ["grading_policy", 1, 0]]),
  );
  m.copyOps.mockResolvedValue(
    step([["classes", 6, 0], ["homeroom_teachers", 6, 0], ["teaching_assignments", 40, 0], ["timetable", 90, 0]]),
  );
  m.copyGrading.mockResolvedValue(step([["report_types", 3, 0], ["evaluation_weights", 9, 0]]));
  m.runCopy.mockResolvedValue(undefined);
  m.updateRun.mockResolvedValue({});
});

describe("YearCopyWizard", () => {
  it("new year starts at Identitas tahun and lists five steps", () => {
    renderWizard();
    const list = screen.getByRole("list", { name: "Langkah penyalinan" });
    const labels = within(list).getAllByRole("listitem").map((li) => li.textContent?.replace(/^\d+/, ""));
    expect(labels).toEqual([
      "Identitas tahun",
      "Tahun sumber",
      "Data yang disalin",
      "Tanggal semester",
      "Ringkasan",
    ]);
    expect(current()).toContain("Identitas tahun");
    expect(screen.getByText("Nama")).toBeInTheDocument();
  });

  it("existing Draft year starts at Tahun sumber", () => {
    renderWizard({ targetYearId: TGT });
    expect(current()).toContain("Tahun sumber");
    expect(screen.getByTestId("year-context")).toHaveTextContent("Tujuan: 2026/2027 (Draft)");
  });

  it("source defaults to the most recent other year", () => {
    renderWizard({ targetYearId: TGT });
    expect(screen.getByTestId("year-context")).toHaveTextContent("Sumber: 2025/2026");
    expect(screen.getByRole("combobox", { name: "Tahun sumber" })).toHaveTextContent("2025/2026");
  });

  it("Mulai kosong finishes after creating the year", async () => {
    m.createYear.mockResolvedValue(year("new-id", "2027/2028", "2027-07-15"));
    renderWizard();
    fireEvent.change(screen.getByPlaceholderText("contoh: 2026/2027"), { target: { value: "2027/2028" } });
    const dates = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dates[0], { target: { value: "2027-07-15" } });
    fireEvent.change(dates[1], { target: { value: "2028-06-30" } });
    next();
    await waitFor(() => expect(current()).toContain("Tahun sumber"));
    expect(m.createYear).toHaveBeenCalledWith({
      name: "2027/2028",
      start_date: "2027-07-15",
      end_date: "2028-06-30",
    });
    fireEvent.click(screen.getByRole("button", { name: "Mulai kosong" }));
    expect(m.push).toHaveBeenCalledWith("/settings/academic/years");
    expect(m.startRun).not.toHaveBeenCalled();
    expect(m.runCopy).not.toHaveBeenCalled();
    expect(m.copyConfig).not.toHaveBeenCalled();
  });

  it("step 3 shows source counts from the dry runs", async () => {
    renderWizard({ targetYearId: TGT });
    next();
    expect(await screen.findByTestId("count-terms")).toHaveTextContent("2");
    expect(screen.getByTestId("count-grade_levels")).toHaveTextContent("6");
    expect(await screen.findByTestId("count-teaching_assignments")).toHaveTextContent("40");
    expect(await screen.findByTestId("count-report_types")).toHaveTextContent("3");
    expect(m.copyConfig).toHaveBeenCalledWith(
      expect.objectContaining({ dry_run: true, source_academic_year_id: SRC, target_academic_year_id: TGT }),
    );
    const body = m.copyOps.mock.calls[0][0];
    expect(body.id_map).toBeUndefined();
    expect(body.copy_run_id).toBeUndefined();
    expect(body.items).toEqual(["classes", "homeroom_teachers", "teaching_assignments", "timetable"]);
  });

  it("shows the dry-run error instead of counts without blocking the step", async () => {
    m.copyGrading.mockRejectedValue(new ApiHttpError(409, { code: "COPY_DEPENDENCY_NOT_READY", message: "x" }));
    renderWizard({ targetYearId: TGT });
    next();
    expect(await screen.findByTestId("count-terms")).toBeInTheDocument();
    expect(
      await screen.findAllByText("Data dari langkah sebelumnya belum sampai. Coba lagi sebentar lagi."),
    ).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: "Lanjut →" })).toBeEnabled();
  });

  it("term dates step is skipped when Semester is unchecked", async () => {
    renderWizard({ targetYearId: TGT });
    next();
    await screen.findByTestId("count-terms");
    fireEvent.click(screen.getByRole("checkbox", { name: "Semester" }));
    next();
    expect(current()).toContain("Ringkasan");
    expect(document.querySelector('[data-state="skipped"]')?.textContent).toContain("Tanggal semester");
  });

  it("shows shifted term dates on step 4 and sends them with the run", async () => {
    m.startRun.mockResolvedValue(run());
    renderWizard({ targetYearId: TGT });
    next();
    await screen.findByTestId("count-terms");
    next();
    expect(current()).toContain("Tanggal semester");
    expect(screen.getByLabelText("Mulai Semester 1")).toHaveValue("2026-07-15");
    fireEvent.change(screen.getByLabelText("Selesai Semester 2"), { target: { value: "2027-06-25" } });
    next();
    fireEvent.click(screen.getByRole("button", { name: "Mulai salin" }));
    await waitFor(() => expect(m.runCopy).toHaveBeenCalled());
    const input = m.startRun.mock.calls[0][0];
    expect(input.source_academic_year_id).toBe(SRC);
    expect(input.term_dates).toEqual([
      { source_term_id: "s1", name: "Semester 1", start_date: "2026-07-15", end_date: "2026-12-20" },
      { source_term_id: "s2", name: "Semester 2", start_date: "2027-01-05", end_date: "2027-06-25" },
    ]);
    expect(input.items).toContain("terms");
  });

  it("resume reads a bare-array config_result and an object ops_result", () => {
    const stored = run({
      items: ["terms", "classes", "report_types"],
      config_result: [
        { item: "terms", source: 2, target_existing: 0, copied: 2, skipped: 1 },
        { item: "classes", source: 3, target_existing: 0, copied: 3, skipped: 0 },
      ],
      ops_result: { results: [{ item: "classes", source: 3, target_existing: 0, copied: 3, skipped: 2 }] },
    });
    renderWizard({ resumeRun: stored });
    expect(screen.getByTestId("part-config")).toHaveTextContent("5 disalin, 1 dilewati");
    expect(screen.getByTestId("part-ops")).toHaveTextContent("3 disalin, 2 dilewati");
  });

  it("resume opens Ringkasan and runs only the remaining parts", async () => {
    const stored = run({ config_result: step([["terms", 2, 0]]).results });
    renderWizard({ resumeRun: stored });
    expect(current()).toContain("Ringkasan");
    expect(screen.getByTestId("part-config")).toHaveTextContent("0 disalin, 0 dilewati");
    expect(screen.getByTestId("part-grading")).toHaveTextContent("Belum dimulai");
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await waitFor(() => expect(m.runCopy).toHaveBeenCalledTimes(1));
    expect(m.runCopy.mock.calls[0][0]).toBe(stored);
    expect(m.startRun).not.toHaveBeenCalled();
  });

  it("start conflict offers resume", async () => {
    const existing = run({ copy_run_id: "run-old" });
    m.startRun.mockRejectedValue(
      new ApiHttpError(409, { code: "COPY_RUN_IN_PROGRESS", message: "in progress" }),
    );
    m.currentRun = { data: existing, refetch: vi.fn().mockResolvedValue({ data: existing }) };
    renderWizard({ targetYearId: TGT });
    next();
    await screen.findByTestId("count-terms");
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Mulai salin" }));
    expect(
      await screen.findByText(/Masih ada penyalinan yang belum selesai untuk tahun ini/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan penyalinan sebelumnya" }));
    await waitFor(() => expect(m.runCopy).toHaveBeenCalled());
    expect(m.runCopy.mock.calls[0][0]).toBe(existing);
  });

  it("hint when assignments without classes", async () => {
    m.copyOps.mockResolvedValue(
      step([["classes", 6, 6], ["homeroom_teachers", 6, 0], ["teaching_assignments", 40, 0], ["timetable", 90, 0]]),
    );
    renderWizard({ targetYearId: TGT });
    next();
    await screen.findByTestId("count-teaching_assignments");
    expect(screen.queryByText("Kelas yang belum ada di tahun tujuan akan ikut dibuat.")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Kelas" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Penugasan guru" }));
    expect(screen.getByText("Kelas yang belum ada di tahun tujuan akan ikut dibuat.")).toBeInTheDocument();
  });

  it("shows a term_dates error from the run with a way back", async () => {
    m.startRun.mockResolvedValue(run());
    m.runCopy.mockImplementation(async (_r, _d, onProgress) => {
      onProgress("config", "error", {
        error: new ApiHttpError(400, {
          code: "VALIDATION_ERROR",
          message: "bad",
          fields: { term_dates: ["Semester 1 tumpang tindih"] },
        }),
      });
    });
    renderWizard({ targetYearId: TGT });
    next();
    await screen.findByTestId("count-terms");
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Mulai salin" }));
    fireEvent.click(await screen.findByRole("button", { name: "Kembali ke Tanggal semester" }));
    expect(current()).toContain("Tanggal semester");
    expect(screen.getByRole("alert")).toHaveTextContent("Semester 1 tumpang tindih");
  });

  it("resume with term_dates: error, back, dates shown, restart sends term_dates", async () => {
    const stored = run({
      term_dates: [
        { source_term_id: "s1", name: "Semester 1", start_date: "2026-07-20", end_date: "2026-12-20" },
        { source_term_id: "s2", name: "Semester 2", start_date: "2027-01-05", end_date: "2027-06-20" },
      ],
    });
    m.runCopy.mockImplementationOnce(async (_r, _d, onProgress) => {
      onProgress("config", "error", {
        error: new ApiHttpError(400, {
          code: "VALIDATION_ERROR",
          message: "bad",
          fields: { term_dates: ["Semester 1 tumpang tindih"] },
        }),
      });
    });
    m.startRun.mockResolvedValue(run({ copy_run_id: "run-2" }));
    renderWizard({ resumeRun: stored });
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    fireEvent.click(await screen.findByRole("button", { name: "Kembali ke Tanggal semester" }));
    expect(current()).toContain("Tanggal semester");
    expect(screen.getByLabelText("Mulai Semester 1")).toHaveValue("2026-07-20");
    fireEvent.change(screen.getByLabelText("Selesai Semester 1"), { target: { value: "2026-12-10" } });
    next();
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await waitFor(() => expect(m.startRun).toHaveBeenCalled());
    expect(m.updateRun).toHaveBeenCalledWith({ copyRunId: "run-1", status: "cancelled" });
    expect(m.startRun.mock.calls[0][0].term_dates).toEqual([
      { source_term_id: "s1", name: "Semester 1", start_date: "2026-07-20", end_date: "2026-12-10" },
      { source_term_id: "s2", name: "Semester 2", start_date: "2027-01-05", end_date: "2027-06-20" },
    ]);
  });

  it("resume without stored term_dates seeds the dates from the shifted source terms", async () => {
    m.runCopy.mockImplementationOnce(async (_r, _d, onProgress) => {
      onProgress("config", "error", {
        error: new ApiHttpError(400, {
          code: "VALIDATION_ERROR",
          message: "bad",
          fields: { term_dates: ["x"] },
        }),
      });
    });
    renderWizard({ resumeRun: run() });
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    fireEvent.click(await screen.findByRole("button", { name: "Kembali ke Tanggal semester" }));
    expect(screen.getByLabelText("Mulai Semester 1")).toHaveValue("2026-07-15");
  });

  it("a failed cancel PATCH shows the error and does not start a new run", async () => {
    m.runCopy.mockImplementationOnce(async (_r, _d, onProgress) => {
      onProgress("config", "error", {
        error: new ApiHttpError(400, {
          code: "VALIDATION_ERROR",
          message: "bad",
          fields: { term_dates: ["x"] },
        }),
      });
    });
    const cancelError = new ApiHttpError(500, { code: "INTERNAL_ERROR", message: "boom" });
    m.updateRun.mockRejectedValue(cancelError);
    renderWizard({ resumeRun: run() });
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    fireEvent.click(await screen.findByRole("button", { name: "Kembali ke Tanggal semester" }));
    next();
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await waitFor(() => expect(m.updateRun).toHaveBeenCalled());
    expect(
      await screen.findByText(getErrorMessage(cancelError, { fallback: "Tidak bisa memulai penyalinan." })),
    ).toBeInTheDocument();
    expect(m.startRun).not.toHaveBeenCalled();
    // needsRestart is kept: a second attempt cancels again instead of re-running the old run
    m.updateRun.mockResolvedValue({});
    m.startRun.mockResolvedValue(run({ copy_run_id: "run-2" }));
    fireEvent.click(screen.getByRole("button", { name: "Lanjutkan" }));
    await waitFor(() => expect(m.startRun).toHaveBeenCalledTimes(1));
    expect(m.updateRun).toHaveBeenCalledTimes(2);
  });

  it("Coba lagi refetches and hands the fresh run (with finished parts) to the runner", async () => {
    const fresh = run({ config_result: step([["terms", 2, 0]]).results });
    m.startRun.mockResolvedValue(run());
    m.currentRun = { data: null, refetch: vi.fn().mockResolvedValue({ data: fresh }) };
    m.runCopy.mockImplementationOnce(async (_r, _d, onProgress) => {
      onProgress("grading", "error", { error: new ApiHttpError(500, { code: "INTERNAL_ERROR", message: "x" }) });
    });
    renderWizard({ targetYearId: TGT });
    next();
    await screen.findByTestId("count-terms");
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Mulai salin" }));
    fireEvent.click(await screen.findByRole("button", { name: "Coba lagi" }));
    await waitFor(() => expect(m.runCopy).toHaveBeenCalledTimes(2));
    expect(m.currentRun.refetch).toHaveBeenCalled();
    expect(m.runCopy.mock.calls[1][0]).toBe(fresh);
  });

  it("a locked item shows its reason", async () => {
    renderWizard({ targetYearId: TGT });
    next();
    await screen.findByTestId("count-terms");
    fireEvent.click(screen.getByRole("checkbox", { name: "Kelas" }));
    expect(screen.getAllByText("Butuh Kelas").length).toBeGreaterThan(0);
    expect(screen.getByRole("checkbox", { name: "Wali kelas" })).toBeDisabled();
  });

  it("shows the real status of the target year", () => {
    m.years = [year(SRC, "2025/2026", "2025-07-15", "Closed"), year(TGT, "2026/2027", "2026-07-15", "Active")];
    renderWizard({ targetYearId: TGT });
    expect(screen.getByTestId("year-context")).toHaveTextContent("Tujuan: 2026/2027 (Aktif)");
  });

  it("ignores a second execute while a run is in progress", async () => {
    m.startRun.mockResolvedValue(run());
    m.currentRun = { data: null, refetch: vi.fn().mockResolvedValue({ data: run() }) };
    let release: () => void = () => {};
    m.runCopy.mockImplementation(
      (_r, _d, onProgress) =>
        new Promise<void>((resolve) => {
          onProgress("config", "running");
          release = resolve;
        }),
    );
    m.startRun.mockResolvedValue(run());
    renderWizard({ targetYearId: TGT });
    next();
    await screen.findByTestId("count-terms");
    next();
    next();
    const start = screen.getByRole("button", { name: "Mulai salin" });
    fireEvent.click(start);
    await waitFor(() => expect(m.runCopy).toHaveBeenCalledTimes(1));
    fireEvent.click(start);
    fireEvent.click(start);
    await Promise.resolve();
    expect(m.runCopy).toHaveBeenCalledTimes(1);
    expect(m.startRun).toHaveBeenCalledTimes(1);
    release();
  });
});
