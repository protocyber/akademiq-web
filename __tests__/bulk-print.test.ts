/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach } from "vitest";

import {
  BULK_PRINT_STORAGE_KEY,
  readBulkPrintIds,
  writeBulkPrintIds,
  clearBulkPrintIds,
} from "@/lib/report-cards/bulk-print";

describe("bulk-print localStorage contract", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips written IDs back unchanged", () => {
    const ids = ["rc-1", "rc-2", "rc-3"];
    writeBulkPrintIds(ids);
    expect(readBulkPrintIds()).toEqual(ids);
  });

  it("returns an empty list when nothing is stored", () => {
    expect(readBulkPrintIds()).toEqual([]);
  });

  it("stores the IDs as a JSON array under the documented key", () => {
    writeBulkPrintIds(["rc-1"]);
    expect(window.localStorage.getItem(BULK_PRINT_STORAGE_KEY)).toBe(
      JSON.stringify(["rc-1"]),
    );
  });

  it("uses localStorage so the IDs are shared across tabs", () => {
    writeBulkPrintIds(["rc-1"]);
    expect(window.localStorage.getItem(BULK_PRINT_STORAGE_KEY)).not.toBeNull();
  });

  it("recovers gracefully from corrupt JSON", () => {
    window.localStorage.setItem(BULK_PRINT_STORAGE_KEY, "{not json");
    expect(readBulkPrintIds()).toEqual([]);
  });

  it("drops non-array payloads", () => {
    window.localStorage.setItem(BULK_PRINT_STORAGE_KEY, JSON.stringify({ id: "rc-1" }));
    expect(readBulkPrintIds()).toEqual([]);
  });

  it("filters out non-string entries", () => {
    window.localStorage.setItem(
      BULK_PRINT_STORAGE_KEY,
      JSON.stringify(["rc-1", 42, null, { x: 1 }, "rc-2"]),
    );
    expect(readBulkPrintIds()).toEqual(["rc-1", "rc-2"]);
  });

  it("clears the stored IDs", () => {
    writeBulkPrintIds(["rc-1"]);
    clearBulkPrintIds();
    expect(window.localStorage.getItem(BULK_PRINT_STORAGE_KEY)).toBeNull();
  });
});
