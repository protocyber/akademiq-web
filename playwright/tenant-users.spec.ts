import { expect, Page, test } from "@playwright/test";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, accept",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

async function seedAuth(page: Page) {
  await page.addInitScript(() => {
    if (window.location.pathname.startsWith("/invitations/")) return;
    window.localStorage.setItem("akademiq.access_token", "playwright-access-token");
    window.localStorage.setItem("akademiq.refresh_token", "playwright-refresh-token");
  });
}

async function mockApis(page: Page) {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const teacherId = "22222222-2222-4222-8222-222222222222";
  const invitations: Array<Record<string, unknown>> = [];
  const users: Array<Record<string, unknown>> = [
    {
      user_id: teacherId,
      tenant_id: tenantId,
      email: "teacher@school.test",
      full_name: "Teacher User",
      status: "active",
      role_code: "teacher",
    },
  ];

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    const ok = async (data: unknown, status = 200) => {
      await route.fulfill({
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ data, meta: {} }),
      });
    };

    if (path === "/api/v1/iam/me") {
      await ok({
        user_id: "33333333-3333-4333-8333-333333333333",
        email: "admin@akademiq.test",
        full_name: "Tenant Admin",
        status: "active",
        memberships: [{ tenant_id: tenantId, role_code: "tenant_admin" }],
      });
      return;
    }

    if (path === "/api/v1/billing/tenants/me") {
      await ok({
        tenant_id: tenantId,
        school_name: "Playwright School",
        status: "active",
        current_plan: { plan_id: "44444444-4444-4444-8444-444444444444", code: "starter", name: "Starter" },
        modules: [],
      });
      return;
    }

    if (path === "/api/v1/iam/tenants/me/users" && method === "GET") {
      await ok(users);
      return;
    }

    if (path === "/api/v1/iam/tenants/me/invitations" && method === "GET") {
      await ok(invitations);
      return;
    }

    if (path === "/api/v1/iam/tenants/me/invitations" && method === "POST") {
      const body = request.postDataJSON();
      const invitation = {
        invitation_id: "55555555-5555-4555-8555-555555555555",
        tenant_id: tenantId,
        email: body.email,
        role_code: body.role,
        status: "pending",
        expires_at: "2026-06-16T12:00:00Z",
        invited_by: "33333333-3333-4333-8333-333333333333",
        accepted_at: null,
        created_at: "2026-06-09T12:00:00Z",
      };
      invitations.splice(0, invitations.length, invitation);
      await ok({ ...invitation, activation_link: "/invitations/accept?token=invite-token", token: "invite-token" }, 201);
      return;
    }

    if (path === `/api/v1/iam/tenants/me/users/${teacherId}/role` && method === "PATCH") {
      const body = request.postDataJSON();
      users[0].role_code = body.role;
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (path === "/api/v1/iam/invitations/accept" && method === "POST") {
      await ok({ access_token: "accepted-access", refresh_token: "accepted-refresh", expires_in: 900 }, 201);
      return;
    }

    await route.fulfill({
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: { code: "UNHANDLED_ROUTE", message: path } }),
    });
  });
}

test("tenant admin invites, accepts, and changes a user role", async ({ page }) => {
  await seedAuth(page);
  await mockApis(page);

  await page.goto("/settings/users");
  await expect(page.getByText("Teacher User")).toBeVisible();
  await page.getByRole("button", { name: /undang pengguna/i }).click();
  await page.getByLabel("Email").fill("principal@school.test");
  await page.getByRole("combobox", { name: /role/i }).click();
  await page.getByRole("option", { name: /kepala sekolah/i }).click();
  await page.getByRole("button", { name: /buat undangan/i }).click();
  await expect(page.getByText(/\/invitations\/accept\?token=invite-token/)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.locator("text=Teacher User").waitFor();
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /kepala sekolah/i }).click();
  await expect(page.getByText("Role pengguna diperbarui.")).toBeVisible();

  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/invitations/accept?token=invite-token");
  await page.getByLabel(/nama lengkap/i).fill("Principal User");
  await page.getByLabel(/^password$/i).fill("password123!");
  await page.getByRole("button", { name: /aktifkan akun/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
