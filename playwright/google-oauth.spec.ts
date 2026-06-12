import { expect, test } from "@playwright/test";

test("Gmail callback reaches zero-tenant state, then enters after invitation", async ({ page }) => {
  let invited = false;

  await page.route("**/api/v1/iam/my-tenants", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: invited
          ? [{ tenant_id: "11111111-1111-1111-1111-111111111111", tenant_name: "Sekolah Demo", role_code: "teacher" }]
          : [],
        meta: {},
      }),
    });
  });

  await page.route("**/api/v1/iam/tenants/11111111-1111-1111-1111-111111111111/enter", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { access_token: "access-token", refresh_token: "refresh-token", expires_in: 900 },
        meta: { user_id: "22222222-2222-2222-2222-222222222222", tenant_id: "11111111-1111-1111-1111-111111111111", role: "teacher" },
      }),
    });
  });

  await page.route("**/api/v1/iam/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user_id: "22222222-2222-2222-2222-222222222222",
          username: "google-user",
          email: "google-user@school.test",
          email_verified: true,
          full_name: "Google User",
          status: "active",
          memberships: invited ? [{ tenant_id: "11111111-1111-1111-1111-111111111111", role_code: "teacher" }] : [],
        },
        meta: {},
      }),
    });
  });

  await page.route("**/api/v1/billing/tenants/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          tenant_id: "11111111-1111-1111-1111-111111111111",
          school_name: "Sekolah Demo",
          status: "active",
          current_plan: { plan_id: "33333333-3333-3333-3333-333333333333", code: "basic", name: "Basic" },
          modules: [],
        },
        meta: {},
      }),
    });
  });

  await page.goto("/auth/callback?identity_token=identity-token");
  await expect(page.getByText("Anda belum terdaftar di sekolah mana pun", { exact: true })).toBeVisible();

  invited = true;
  await page.goto("/tenant-select");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Dasbor Sekolah/i })).toBeVisible();
});
