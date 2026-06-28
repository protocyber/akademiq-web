import { describe, expect, it } from "vitest";

import { loginSchema } from "@/lib/schemas/login";
import { registerSchema } from "@/lib/schemas/register";
import { moduleToggleSchema } from "@/lib/schemas/module-toggle";
import { schoolProfileSchema } from "@/lib/schemas/academic-ops";

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
        /minimal 8/i,
      );
    }
  });

  it("rejects non-uuid plan_id", () => {
    const r = registerSchema.safeParse({ ...valid, plan_id: "not-uuid" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.plan_id?.[0]).toMatch(/paket/i);
    }
  });
});

describe("schoolProfileSchema", () => {
  const valid = {
    school_name: "SMA Negeri 1 Jakarta",
    school_level: "sma",
    school_status: "negeri",
    accreditation: "a",
  };

  it("accepts valid complete input", () => {
    expect(schoolProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts minimum input (school_name only)", () => {
    expect(schoolProfileSchema.safeParse({ school_name: "SD Test" }).success).toBe(true);
  });

  it("accepts empty string for optional enums", () => {
    const r = schoolProfileSchema.safeParse({
      school_name: "SD Test",
      school_level: "",
      school_status: "",
      accreditation: "",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid school_level", () => {
    const r = schoolProfileSchema.safeParse({ ...valid, school_level: "tk" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid school_status", () => {
    const r = schoolProfileSchema.safeParse({ ...valid, school_status: "negeri-swasta" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid accreditation", () => {
    const r = schoolProfileSchema.safeParse({ ...valid, accreditation: "x" });
    expect(r.success).toBe(false);
  });

  it("rejects empty school_name", () => {
    const r = schoolProfileSchema.safeParse({ school_name: "" });
    expect(r.success).toBe(false);
  });

  it("accepts all valid school_level values", () => {
    for (const level of ["sd", "smp", "sma", "mi", "mts", "ma", "slb", "lainnya"]) {
      expect(schoolProfileSchema.safeParse({ ...valid, school_level: level }).success).toBe(true);
    }
  });

  it("accepts all valid accreditation values", () => {
    for (const acc of ["a", "b", "c", "belum_terakreditasi"]) {
      expect(schoolProfileSchema.safeParse({ ...valid, accreditation: acc }).success).toBe(true);
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
