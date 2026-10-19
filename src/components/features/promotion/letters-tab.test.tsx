/** @vitest-environment jsdom */
import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiHttpError } from "@/lib/api/types";
import type { LettersSummary } from "@/lib/query/queries/use-promotion-letters";

const issue = vi.hoisted(() => vi.fn());
const summary = vi.hoisted(() => ({ current: null as LettersSummary | null }));

vi.mock("@/lib/query/queries/use-promotion-letters", () => ({
  usePromotionLetters: () => ({ data: summary.current, isLoading: false, error: null }),
  useCertificatesPrint: () => ({ data: { letterhead: null, source_year_name: null, certificates: [] }, isLoading: false }),
}));
vi.mock("@/lib/query/mutations/use-promotion-letters", () => ({
  useIssueClassLetter: () => ({ mutateAsync: issue, isPending: false }),
  useIssueCertificates: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRefreshLetterPrincipal: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { LettersTab } from "@/components/features/promotion/letters-tab";

const H = "11111111-1111-4111-8111-111111111111";

function base(principal: string | null): LettersSummary {
  return {
    school_profile: principal
      ? ({ school_name: "SMP Negeri 1", principal_name: principal, principal_nip: null, city_regency: "Surabaya" } as LettersSummary["school_profile"])
      : null,
    class_letters: [{ homeroom_id: H, homeroom_name: "VII-A", counts: { promote: 30, retain: 1, graduate: 0 }, letter: null }],
    certificates: { graduates: 0, issued: 0 },
  };
}

describe("LettersTab", () => {
  beforeEach(() => issue.mockReset());

  it("locks issuing when the school profile has no principal", () => {
    summary.current = base(null);
    render(<LettersTab runId="run-1" editable />);
    expect(screen.getByText(/Nama kepala sekolah belum diisi/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Buka Profil Sekolah" }).getAttribute("href")).toBe("/settings/school-profile");
    expect((screen.getByRole("button", { name: "Terbitkan" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables printing until the letter is issued and hides actions when read-only", () => {
    summary.current = base("Dra. Siti Rahayu");
    const { rerender } = render(<LettersTab runId="run-1" editable />);
    expect(screen.getByText("Belum terbit")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Cetak" }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<LettersTab runId="run-1" editable={false} />);
    expect(screen.queryByRole("button", { name: "Terbitkan" })).toBeNull();
  });

  it("maps a duplicate-number error to the number field", async () => {
    summary.current = base("Dra. Siti Rahayu");
    issue.mockRejectedValueOnce(
      new ApiHttpError(400, {
        code: "VALIDATION_ERROR",
        message: "invalid",
        fields: { letter_number: ["is already used by another letter"] },
      }),
    );
    render(<LettersTab runId="run-1" editable />);
    fireEvent.click(screen.getByRole("button", { name: "Terbitkan" }));
    fireEvent.change(screen.getByLabelText(/Nomor SK/), { target: { value: "421/001" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(issue).toHaveBeenCalledTimes(1));
    expect(issue.mock.calls[0][0]).toMatchObject({ homeroomId: H, letter_number: "421/001", city: null });
    expect(await screen.findByText("Nomor sudah dipakai surat lain")).toBeTruthy();
  });

  it("maps a required-city error to the city field, not the number field", async () => {
    summary.current = base("Dra. Siti Rahayu");
    issue.mockRejectedValueOnce(
      new ApiHttpError(400, {
        code: "VALIDATION_ERROR",
        message: "invalid",
        fields: { city: ["is required"] },
      }),
    );
    render(<LettersTab runId="run-1" editable />);
    fireEvent.click(screen.getByRole("button", { name: "Terbitkan" }));
    fireEvent.change(screen.getByLabelText(/Nomor SK/), { target: { value: "421/001" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(issue).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Kota wajib diisi")).toBeTruthy();
    expect(screen.queryByText("Nomor wajib diisi")).toBeNull();
  });
});
