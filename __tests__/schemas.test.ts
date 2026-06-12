import { describe, expect, it } from "vitest";

import { loginSchema } from "@/lib/schemas/login";
import { registerSchema } from "@/lib/schemas/register";
import { moduleToggleSchema } from "@/lib/schemas/module-toggle";

describe("loginSchema", () => {
  it("accepts a valid email identifier and password", () => {
    const r = loginSchema.safeParse({ identifier: "a@b.test", password: "x" });
    expect(r.success).toBe(true);
  });

  it("accepts a username identifier", () => {
    const r = loginSchema.safeParse({ identifier: "teacher_one", password: "x" });
    expect(r.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const r = loginSchema.safeParse({ identifier: "a@b.test", password: "" });
    expect(r.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    school_name: "Sekolah Demo",
    plan_id: "11111111-2222-3333-4444-555555555555",
    admin_email: "admin@school.test",
    admin_password: "hunter2hunter",
    admin_full_name: "Admin",
  };

  it("accepts valid input", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short password", () => {
    const r = registerSchema.safeParse({ ...valid, admin_password: "short" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.admin_password?.[0]).toMatch(
        /at least 8/,
      );
    }
  });

  it("rejects non-uuid plan_id", () => {
    const r = registerSchema.safeParse({ ...valid, plan_id: "not-uuid" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.plan_id?.[0]).toMatch(/plan/i);
    }
  });
});

describe("moduleToggleSchema", () => {
  it("accepts valid input", () => {
    expect(
      moduleToggleSchema.safeParse({ feature_code: "attendance", enabled: false })
        .success,
    ).toBe(true);
  });

  it("rejects empty feature_code", () => {
    expect(
      moduleToggleSchema.safeParse({ feature_code: "", enabled: true }).success,
    ).toBe(false);
  });
});
