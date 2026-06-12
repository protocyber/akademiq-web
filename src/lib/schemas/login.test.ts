import { describe, expect, it } from "vitest";

import { loginSchema } from "./login";

describe("loginSchema", () => {
  it("accepts an email identifier", () => {
    const parsed = loginSchema.parse({
      identifier: "teacher@school.test",
      password: "password123!",
      remember_device: false,
    });

    expect(parsed.identifier).toBe("teacher@school.test");
  });

  it("accepts a bare username identifier", () => {
    const parsed = loginSchema.parse({
      identifier: "teacher_one",
      password: "password123!",
      remember_device: false,
    });

    expect(parsed.identifier).toBe("teacher_one");
  });

  it("rejects an empty identifier", () => {
    const parsed = loginSchema.safeParse({
      identifier: "",
      password: "password123!",
      remember_device: false,
    });

    expect(parsed.success).toBe(false);
  });
});
