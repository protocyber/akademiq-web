import { test, expect } from "@playwright/test";

/**
 * Smoke test for the public marketing surface. Does not require the
 * backend to be running — it just confirms the home page renders and
 * the navigation links land on /register and /login skeletons.
 */
test("home page renders register and login CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AcademiQ" })).toBeVisible();
  await expect(page.getByRole("link", { name: /daftar sekolah/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^masuk$/i })).toBeVisible();
});

test("login page renders form controls", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^masuk$/i })).toBeVisible();
});

test("register page starts at school details step", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByLabel(/nama sekolah/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /lanjut/i })).toBeVisible();
});
