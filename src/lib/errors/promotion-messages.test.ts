import { describe, expect, it } from "vitest";

import { ApiHttpError } from "@/lib/api/types";
import { getErrorMessage, promotionFieldGroups } from "@/lib/errors/messages";

describe("promotion error copy", () => {
  it("has Indonesian copy for the promotion codes", () => {
    for (const code of ["PROMOTION_RUN_EXISTS", "PROMOTION_RUN_INVALID_STATUS", "PROMOTION_SELF_APPROVAL"]) {
      const message = getErrorMessage(new ApiHttpError(409, { code, message: "english" }));
      expect(message).not.toBe("english");
    }
  });

  it("groups field errors under Indonesian headings in a stable order", () => {
    const error = new ApiHttpError(400, {
      code: "VALIDATION_ERROR",
      message: "invalid",
      fields: {
        enrollments: ["student a is already enrolled in the target academic year"],
        targets: ["student b has no target homeroom"],
        unknown_key: ["something"],
      },
    });
    expect(promotionFieldGroups(error)).toEqual([
      { field: "targets", label: "Tujuan belum lengkap", messages: ["student b has no target homeroom"] },
      {
        field: "enrollments",
        label: "Bentrok enrollment",
        messages: ["student a is already enrolled in the target academic year"],
      },
      { field: "unknown_key", label: "unknown_key", messages: ["something"] },
    ]);
  });

  it("returns no groups for a non-validation error", () => {
    expect(promotionFieldGroups(new Error("boom"))).toEqual([]);
  });
});
