import { describe, expect, it } from "vitest";

import {
  createTenantUserSchema,
  updateTenantUserSchema,
} from "./tenant-user-management";

describe("createTenantUserSchema", () => {
  it("accepts a valid create payload", () => {
    const parsed = createTenantUserSchema.safeParse({
      username: "budi_guru",
      full_name: "Budi Santoso",
      roles: ["teacher"],
      email: "budi@school.test",
      password: "securepass1",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts a payload with no email/password (pending account)", () => {
    const parsed = createTenantUserSchema.safeParse({
      username: "budi_guru",
      full_name: "Budi Santoso",
      roles: ["teacher"],
      email: "",
      password: "",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects a username containing '@'", () => {
    const parsed = createTenantUserSchema.safeParse({
      username: "budi@guru",
      full_name: "Budi Santoso",
      roles: ["teacher"],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects an empty role list", () => {
    const parsed = createTenantUserSchema.safeParse({
      username: "budi_guru",
      full_name: "Budi Santoso",
      roles: [],
    });

    expect(parsed.success).toBe(false);
  });
});

describe("updateTenantUserSchema", () => {
  it("accepts a valid update payload", () => {
    const parsed = updateTenantUserSchema.safeParse({
      username: "budi_baru",
      full_name: "Budi Santoso",
      email: "new@school.test",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects a malformed username", () => {
    const parsed = updateTenantUserSchema.safeParse({
      username: "B",
      full_name: "Budi Santoso",
    });

    expect(parsed.success).toBe(false);
  });
});
