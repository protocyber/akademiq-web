/** @vitest-environment jsdom */
import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiHttpError } from "@/lib/api/types";
import type { Certificate } from "@/lib/query/queries/use-promotion-letters";

const save = vi.hoisted(() => vi.fn());
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function cert(student_id: string, full_name: string, certificate_number: string | null): Certificate {
  return {
    student_id, full_name, nis: `N-${full_name}`, nisn: null, birth_place: null, birth_date: null,
    last_homeroom_name: "IX-A", graduation_date: "2026-06-15", certificate_number,
    letter_date: certificate_number ? "2026-06-22" : null, city: certificate_number ? "Surabaya" : null,
    school_name: null, principal_name: null, principal_nip: null, issued_at: null, updated_at: null,
  };
}

vi.mock("@/lib/query/queries/use-promotion-letters", () => ({
  useCertificatesPrint: () => ({
    data: { letterhead: null, source_year_name: "2025/2026", certificates: [cert(A, "Budi", null), cert(B, "Ani", "X-1")] },
    isLoading: false,
    error: null,
  }),
}));
vi.mock("@/lib/query/mutations/use-promotion-letters", () => ({
  useIssueCertificates: () => ({ mutateAsync: save, isPending: false }),
}));

import { CertificatesSection } from "@/components/features/promotion/certificates-section";

describe("CertificatesSection", () => {
  beforeEach(() => save.mockReset());

  it("flags duplicate numbers before saving and blocks the save", () => {
    render(<CertificatesSection runId="run-1" editable hasPrincipal defaultCity="Surabaya" />);
    fireEvent.change(screen.getByLabelText("Nomor surat Budi"), { target: { value: "X-1" } });
    expect(screen.getAllByText("Nomor dipakai dua kali").length).toBe(2);
    expect((screen.getByRole("button", { name: "Simpan nomor" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("sends only changed rows and maps row errors to names", async () => {
    save.mockRejectedValueOnce(
      new ApiHttpError(400, {
        code: "VALIDATION_ERROR",
        message: "invalid",
        fields: { items: [`student ${A}: certificate number X-9 is already used by another letter`] },
      }),
    );
    render(<CertificatesSection runId="run-1" editable hasPrincipal defaultCity="Surabaya" />);
    fireEvent.change(screen.getByLabelText("Nomor surat Budi"), { target: { value: "X-9" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan nomor" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    // Ani's saved date is reused when no pattern dialog has set one.
    expect(save.mock.calls[0][0]).toEqual({
      letter_date: "2026-06-22",
      city: null,
      items: [{ student_id: A, certificate_number: "X-9" }],
    });
    expect(await screen.findByText("Nomor sudah dipakai surat lain")).toBeTruthy();
  });

  it("is read-only without manage", () => {
    render(<CertificatesSection runId="run-1" editable={false} hasPrincipal defaultCity={null} />);
    expect(screen.queryByRole("button", { name: "Isi nomor dari pola" })).toBeNull();
    expect(screen.queryByLabelText("Nomor surat Budi")).toBeNull();
    expect(screen.getByText("X-1")).toBeTruthy();
  });
});
