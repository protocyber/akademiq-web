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
  const studentId = "33333333-3333-4333-8333-333333333333";
  const requests: string[] = [];
  const invitations: Array<Record<string, unknown>> = [];
  const users: Array<Record<string, unknown>> = [
    {
      user_id: teacherId,
      tenant_id: tenantId,
      username: "teacher_user",
      email: "teacher@school.test",
      full_name: "Teacher User",
      status: "active",
      roles: ["teacher"],
    },
    {
      user_id: studentId,
      tenant_id: tenantId,
      username: "student_user",
      email: "student@school.test",
      full_name: "Student User",
      status: "active",
      roles: ["student"],
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

    const ok = async (data: unknown, status = 200, meta: Record<string, unknown> = {}) => {
      await route.fulfill({
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ data, meta }),
      });
    };

    if (path === "/api/v1/iam/me") {
      await ok({
        user_id: "44444444-4444-4444-8444-444444444444",
        email: "admin@akademiq.test",
        full_name: "Tenant Admin",
        status: "active",
        memberships: [{ tenant_id: tenantId, roles: ["tenant_admin"] }],
      });
      return;
    }

    if (path === "/api/v1/billing/tenants/me") {
      await ok({
        tenant_id: tenantId,
        school_name: "Playwright School",
        status: "active",
        current_plan: { plan_id: "55555555-5555-4555-8555-555555555555", code: "starter", name: "Starter" },
        modules: [],
      });
      return;
    }

    if (path === "/api/v1/iam/tenants/me/roles") {
      await ok([
        { role_id: "66666666-6666-4666-8666-666666666666", code: "teacher", name: "Guru Mapel", is_builtin: true, permissions: [] },
        { role_id: "77777777-7777-4777-8777-777777777777", code: "principal", name: "Kepala Sekolah", is_builtin: true, permissions: [] },
        { role_id: "88888888-8888-4888-8888-888888888888", code: "student", name: "Siswa", is_builtin: true, permissions: [] },
      ]);
      return;
    }

    if (path === "/api/v1/iam/tenants/me/users" && method === "GET") {
      requests.push(url.search);
      const search = url.searchParams.get("search")?.toLowerCase();
      const role = url.searchParams.get("role");
      const filtered = users.filter((user) => {
        const name = String(user.full_name).toLowerCase();
        const matchesSearch = !search || name.includes(search) || String(user.email).includes(search);
        const matchesRole = !role || (user.roles as string[]).includes(role);
        return matchesSearch && matchesRole;
      });
      await ok(filtered, 200, { page: Number(url.searchParams.get("page") ?? 1), page_size: Number(url.searchParams.get("page_size") ?? 25), total: filtered.length });
      return;
    }

    if (path === "/api/v1/iam/tenants/me/invitations" && method === "GET") {
      await ok(invitations);
      return;
    }

    if (path === "/api/v1/iam/tenants/me/invitations" && method === "POST") {
      const body = request.postDataJSON();
      const invitation = {
        invitation_id: "99999999-9999-4999-8999-999999999999",
        tenant_id: tenantId,
        email: body.email,
        roles: body.roles,
        status: "pending",
        expires_at: "2026-06-16T12:00:00Z",
        invited_by: "44444444-4444-4444-8444-444444444444",
        accepted_at: null,
        created_at: "2026-06-09T12:00:00Z",
      };
      invitations.splice(0, invitations.length, invitation);
      await ok({ ...invitation, activation_link: "/invitations/accept?token=invite-token", token: "invite-token" }, 201);
      return;
    }

    if (path.includes("/roles/") && method === "POST") {
      users[0].roles = ["teacher", "principal"];
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (path === "/api/v1/iam/tenants/me/users/bulk/disable" && method === "POST") {
      const body = request.postDataJSON();
      await ok((body.user_ids as string[]).map((id, index) => ({ user_id: id, success: index === 0, reason: index === 0 ? null : "LAST_ADMIN" })));
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

  return requests;
}

test("tenant admin preserves invite flow", async ({ page }) => {
  await seedAuth(page);
  await mockApis(page);

  await page.goto("/settings/users");
  await expect(page.locator("body")).toContainText("Teacher User");
  await page.getByRole("button", { name: /undang pengguna/i }).click();
  await page.getByLabel("Email").fill("principal@school.test");
  await page.getByRole("button", { name: /buat undangan/i }).click();
  await expect(page.getByText(/\/invitations\/accept\?token=invite-token/)).toBeVisible();
});

test("tenant users URL state restores and sends server params", async ({ page }) => {
  await seedAuth(page);
  const requests = await mockApis(page);

  await page.goto("/settings/users?search=Teacher&role=teacher&page=2&sort=-name");
  await expect(page.getByPlaceholder(/cari nama/i)).toHaveValue("Teacher");
  await expect(page.locator("body")).toContainText("Teacher User");
  expect(requests.some((query) => query.includes("search=Teacher") && query.includes("role=teacher") && query.includes("page=2") && query.includes("sort=-name"))).toBeTruthy();

  await page.getByPlaceholder(/cari nama/i).fill("Student");
  await expect(page).toHaveURL(/search=Student/);
  expect(requests.some((query) => query.includes("search=Student"))).toBeTruthy();
});

test("tenant users bulk action summarizes partial failures", async ({ page }) => {
  await seedAuth(page);
  await mockApis(page);

  await page.goto("/settings/users");
  await expect(page.locator("body")).toContainText("Teacher User");
  await page.getByLabel("Pilih Teacher User").check();
  await page.getByLabel("Pilih Student User").check();
  await page.getByRole("button", { name: "Disable" }).click();
  await expect(page.getByText("1 berhasil, 1 gagal.")).toBeVisible();
  await expect(page.getByText("LAST_ADMIN")).toBeVisible();
});
