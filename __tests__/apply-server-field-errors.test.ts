import { describe, expect, it, vi } from "vitest";

import { ApiHttpError } from "@/lib/api/types";
import {
  applyServerFieldErrors,
  summariseFieldErrors,
} from "@/lib/forms/apply-server-field-errors";

type FakeForm = {
  setError: ReturnType<typeof vi.fn>;
};

function makeForm(): FakeForm {
  return { setError: vi.fn() };
}

describe("applyServerFieldErrors", () => {
  it("calls setError once per field with type 'server'", () => {
    const form = makeForm();
    const err = new ApiHttpError(400, {
      code: "VALIDATION_ERROR",
      message: "validation failed",
      fields: {
        admin_email: ["taken"],
        plan_id: ["unknown"],
      },
    });
    const applied = applyServerFieldErrors(form as any, err);
    expect(applied).toEqual(["admin_email", "plan_id"]);
    expect(form.setError).toHaveBeenCalledTimes(2);
    expect(form.setError).toHaveBeenCalledWith("admin_email", {
      type: "server",
      message: "taken",
    });
    expect(form.setError).toHaveBeenCalledWith("plan_id", {
      type: "server",
      message: "unknown",
    });
  });

  it("returns [] for a non-validation error", () => {
    const form = makeForm();
    const err = new ApiHttpError(409, {
      code: "EMAIL_ALREADY_EXISTS",
      message: "email taken",
    });
    expect(applyServerFieldErrors(form as any, err)).toEqual([]);
    expect(form.setError).not.toHaveBeenCalled();
  });

  it("returns [] for an arbitrary thrown value", () => {
    const form = makeForm();
    expect(applyServerFieldErrors(form as any, new Error("network"))).toEqual([]);
    expect(form.setError).not.toHaveBeenCalled();
  });

  it("ignores empty messages arrays", () => {
    const form = makeForm();
    const err = new ApiHttpError(400, {
      code: "VALIDATION_ERROR",
      message: "validation failed",
      fields: {
        admin_email: [],
        plan_id: ["unknown"],
      },
    });
    const applied = applyServerFieldErrors(form as any, err);
    expect(applied).toEqual(["plan_id"]);
    expect(form.setError).toHaveBeenCalledTimes(1);
  });
});

describe("summariseFieldErrors", () => {
  it("renders each field on its own line", () => {
    const out = summariseFieldErrors({
      admin_email: ["taken"],
      plan_id: ["unknown", "second-message"],
    });
    expect(out).toBe("admin_email: taken\nplan_id: unknown");
  });
});
