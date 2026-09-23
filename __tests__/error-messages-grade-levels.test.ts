import { describe, expect, it } from "vitest";

import { ApiHttpError } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors/messages";

describe("getErrorMessage — grade level error codes", () => {
  it("returns Indonesian copy for GRADE_LEVEL_IN_USE", () => {
    const err = new ApiHttpError(409, {
      code: "GRADE_LEVEL_IN_USE",
      message: "grade level in use",
    });
    expect(getErrorMessage(err)).toBe(
      "Tingkat kelas masih dipakai template kelas dan tidak bisa dihapus.",
    );
  });

  it("returns Indonesian copy for GRADE_LEVEL_CODE_TAKEN", () => {
    const err = new ApiHttpError(409, {
      code: "GRADE_LEVEL_CODE_TAKEN",
      message: "code taken",
    });
    expect(getErrorMessage(err)).toBe(
      "Kode tingkat kelas sudah digunakan dalam tahun ajaran ini. Gunakan kode lain.",
    );
  });

  it("returns Indonesian copy for GRADE_LEVEL_ORDINAL_TAKEN", () => {
    const err = new ApiHttpError(409, {
      code: "GRADE_LEVEL_ORDINAL_TAKEN",
      message: "ordinal taken",
    });
    expect(getErrorMessage(err)).toBe(
      "Urutan tingkat kelas ini sudah dipakai tingkat lain dalam tahun ajaran ini. Pilih urutan lain.",
    );
  });
});
