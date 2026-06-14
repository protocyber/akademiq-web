import { describe, expect, it } from "vitest";

import {
  DEFAULT_TENANT_ROLES_PARAMS,
  parseTenantRolesParams,
  serializeTenantRolesParams,
  tenantRolesParamsKey,
} from "@/lib/schemas/tenant-roles-params";

function roundTrip(params: ReturnType<typeof parseTenantRolesParams>) {
  return parseTenantRolesParams(new URLSearchParams(serializeTenantRolesParams(params)));
}

describe("parseTenantRolesParams", () => {
  it("returns defaults when search params are empty", () => {
    const params = parseTenantRolesParams(new URLSearchParams());
    expect(params).toEqual(DEFAULT_TENANT_ROLES_PARAMS);
  });

  it("defaults page_size to 25 and clamps to 100", () => {
    const params = parseTenantRolesParams(new URLSearchParams("page_size=999"));
    expect(params.page_size).toBe(100);
  });

  it("preserves non-default search, sort, and page", () => {
    const params = parseTenantRolesParams(
      new URLSearchParams("search=kurikulum&sort=-users&page=2&page_size=10"),
    );
    expect(params).toEqual({
      search: "kurikulum",
      page: 2,
      page_size: 10,
      sort: "-users",
    });
  });

  it("falls back to default sort for invalid sort values", () => {
    const params = parseTenantRolesParams(new URLSearchParams("sort=DROP"));
    expect(params.sort).toBe(DEFAULT_TENANT_ROLES_PARAMS.sort);
  });

  it("omits defaults in serialize (round-trip drops default page/page_size/sort)", () => {
    const original = parseTenantRolesParams(new URLSearchParams("search=abc"));
    const serialized = serializeTenantRolesParams(original);
    expect(serialized).toBe("search=abc");
  });

  it("round-trips non-default values", () => {
    const original = parseTenantRolesParams(
      new URLSearchParams("search=abc&sort=-name&page=3&page_size=50"),
    );
    expect(roundTrip(original)).toEqual(original);
  });

  it("paramsKey reflects all params", () => {
    const a = parseTenantRolesParams(new URLSearchParams("search=abc&page=2"));
    const b = parseTenantRolesParams(new URLSearchParams("search=abc&page=3"));
    expect(tenantRolesParamsKey(a)).not.toEqual(tenantRolesParamsKey(b));
  });
});
