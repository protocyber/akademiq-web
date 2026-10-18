import { describe, expect, it } from "vitest";

import { availableActions } from "@/components/features/promotion/action-bar";

describe("availableActions", () => {
  const manage = { canManage: true, canApprove: false };
  const approve = { canManage: false, canApprove: true };
  const both = { canManage: true, canApprove: true };

  it("follows the status × permission matrix", () => {
    expect(availableActions("draft", manage)).toEqual(["reevaluate", "submit"]);
    expect(availableActions("draft", approve)).toEqual([]);
    expect(availableActions("submitted", approve)).toEqual(["approve", "return"]);
    expect(availableActions("submitted", manage)).toEqual([]);
    expect(availableActions("approved", manage)).toEqual(["execute"]);
    expect(availableActions("approved", approve)).toEqual([]);
    expect(availableActions("executed", both)).toEqual([]);
  });
});
