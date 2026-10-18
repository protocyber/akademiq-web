import { describe, expect, it } from "vitest";

import { checkVisibility } from "@/components/layout/sidebar-layout";

describe("checkVisibility moduleAndAnyPermission", () => {
  const rule = {
    kind: "moduleAndAnyPermission" as const,
    featureCode: "academic_ops",
    permissionCodes: ["promotion.manage", "promotion.approve"],
  };

  it("shows the entry to a holder of either permission when the module is on", () => {
    expect(checkVisibility(rule, new Set(["promotion.approve"]), new Set(["academic_ops"]))).toBe(true);
    expect(checkVisibility(rule, new Set(["promotion.manage"]), new Set(["academic_ops"]))).toBe(true);
  });

  it("hides it without a permission or without the module", () => {
    expect(checkVisibility(rule, new Set(["grade.read"]), new Set(["academic_ops"]))).toBe(false);
    expect(checkVisibility(rule, new Set(["promotion.manage"]), new Set())).toBe(false);
  });
});
