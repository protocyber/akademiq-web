import { expect, Page, test } from "@playwright/test";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, accept",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

type AcademicYear = {
  academic_year_id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

type AcademicTerm = {
  term_id: string;
  academic_year_id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

async function seedAuth(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "playwright-access-token");
    window.localStorage.setItem("akademiq.refresh_token", "playwright-refresh-token");
  });
}

async function mockApis(page: Page) {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const academicYearId = "22222222-2222-4222-8222-222222222222";
  const curriculumVersionId = "33333333-3333-4333-8333-333333333333";
  const subjectId = "44444444-4444-4444-8444-444444444444";
  const templateId = "55555555-5555-4555-8555-555555555555";
  const termId1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const termId2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const years: AcademicYear[] = [];
  const curricula: Array<Record<string, unknown>> = [];
  const subjects: Array<Record<string, unknown>> = [];
  const templates: Array<Record<string, unknown>> = [];
  const terms: AcademicTerm[] = [];
  let policy: Record<string, unknown> | null = null;
  let termCounter = 0;

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
    const error = async (code: string, status = 400) => {
      await route.fulfill({
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: { code, message: code } }),
      });
    };

    if (path === "/api/v1/iam/me") {
      await ok({
        user_id: "66666666-6666-4666-8666-666666666666",
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
        current_plan: { plan_id: "77777777-7777-4777-8777-777777777777", code: "starter", name: "Starter" },
        modules: [{ feature_code: "academic_config", plan_entitled: true, enabled: true }],
      });
      return;
    }

    if (path === "/api/v1/academic-config/academic-years" && method === "GET") {
      await ok(years);
      return;
    }

    if (path === "/api/v1/academic-config/academic-years" && method === "POST") {
      const body = request.postDataJSON();
      const year = { academic_year_id: academicYearId, tenant_id: tenantId, status: "Draft", ...body };
      years.splice(0, years.length, year);
      await ok(year, 201);
      return;
    }

    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/status` && method === "PATCH") {
      const body = request.postDataJSON();
      years[0].status = body.status;
      await ok(years[0]);
      return;
    }

    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/curriculum-versions` && method === "GET") {
      await ok(curricula);
      return;
    }

    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/curriculum-versions` && method === "POST") {
      const body = request.postDataJSON();
      const curriculum = { curriculum_version_id: curriculumVersionId, tenant_id: tenantId, academic_year_id: academicYearId, ...body };
      curricula.splice(0, curricula.length, curriculum);
      await ok(curriculum, 201);
      return;
    }

    if (path === `/api/v1/academic-config/curriculum-versions/${curriculumVersionId}/subjects` && method === "GET") {
      await ok(subjects);
      return;
    }

    if (path === `/api/v1/academic-config/curriculum-versions/${curriculumVersionId}/subjects` && method === "POST") {
      const body = request.postDataJSON();
      const subject = { subject_id: subjectId, tenant_id: tenantId, curriculum_version_id: curriculumVersionId, ...body };
      subjects.push(subject);
      await ok(subject, 201);
      return;
    }

    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/grading-policy` && method === "GET") {
      if (policy) await ok(policy);
      else await error("NOT_FOUND", 404);
      return;
    }

    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/grading-policy` && method === "PUT") {
      policy = { policy_id: "88888888-8888-4888-8888-888888888888", tenant_id: tenantId, academic_year_id: academicYearId, ...request.postDataJSON() };
      await ok(policy);
      return;
    }

    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/class-templates` && method === "GET") {
      await ok(templates);
      return;
    }

    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/class-templates` && method === "POST") {
      const template = { template_id: templateId, tenant_id: tenantId, academic_year_id: academicYearId, ...request.postDataJSON() };
      templates.push(template);
      await ok(template, 201);
      return;
    }

    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/terms` && method === "GET") {
      await ok(terms);
      return;
    }

    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/terms` && method === "POST") {
      const body = request.postDataJSON();
      const ids = [termId1, termId2];
      const term: AcademicTerm = {
        term_id: ids[termCounter] ?? `cccccccc-cccc-4ccc-8ccc-${String(termCounter).padStart(12, "c")}`,
        academic_year_id: academicYearId,
        tenant_id: tenantId,
        status: "Draft",
        ...body,
      };
      termCounter++;
      terms.push(term);
      await ok(term, 201);
      return;
    }

    if (path.match(/\/api\/v1\/academic-config\/academic-terms\/[^/]+$/) && method === "PATCH") {
      const termId = path.split("/").pop()!;
      const idx = terms.findIndex((t) => t.term_id === termId);
      if (idx === -1) { await error("NOT_FOUND", 404); return; }
      const body = request.postDataJSON();
      terms[idx] = { ...terms[idx], ...body };
      await ok(terms[idx]);
      return;
    }

    if (path.match(/\/api\/v1\/academic-config\/academic-terms\/[^/]+\/status$/) && method === "PATCH") {
      const termId = path.split("/").slice(-2)[0];
      const idx = terms.findIndex((t) => t.term_id === termId);
      if (idx === -1) { await error("NOT_FOUND", 404); return; }
      const body = request.postDataJSON();
      terms[idx] = { ...terms[idx], status: body.status };
      await ok(terms[idx]);
      return;
    }

    if (path.match(/\/api\/v1\/academic-config\/academic-terms\/[^/]+$/) && method === "DELETE") {
      const termId = path.split("/").pop()!;
      const idx = terms.findIndex((t) => t.term_id === termId);
      if (idx !== -1) terms.splice(idx, 1);
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    await error("UNHANDLED_ROUTE", 500);
  });
}

async function pickFirstCalendarDate(page: Page) {
  await page
    .locator('[data-radix-popper-content-wrapper] button')
    .filter({ hasText: /^\d+$/ })
    .first()
    .click();
}

test("tenant admin walks academic config pages end to end", async ({ page }) => {
  await seedAuth(page);
  await mockApis(page);

  await page.goto("/settings/academic/years");
  await page.getByRole("button", { name: /buat tahun ajaran/i }).click();
  await page.getByLabel("Nama").fill("2026/2027");
  await expect(page.getByText("Pengaturan nilai, kurikulum, dan jenis rapor tersedia setelah tahun ajaran disimpan.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Kebijakan Nilai" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Versi Kurikulum" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Jenis Rapor" })).not.toBeVisible();
  await page.getByLabel(/tanggal mulai/i).click();
  await pickFirstCalendarDate(page);
  await page.getByLabel(/tanggal selesai/i).click();
  await pickFirstCalendarDate(page);
  await page.getByRole("button", { name: /^simpan$/i }).click();
  await expect(page.getByText("2026/2027")).toBeVisible();
  await page.getByRole("button", { name: /aksi/i }).click();
  await page.getByRole("menuitem", { name: /edit/i }).click();
  await page.getByRole("button", { name: /ubah status/i }).click();
  await page.getByLabel(/alasan perubahan status/i).fill("Alasan transisi ke aktif yang sah");
  await page.getByRole("button", { name: /^konfirmasi$/i }).click();
  await expect(page.getByText("Aktif", { exact: true }).first()).toBeVisible();

  // Test the type-to-confirm undo path (Active -> Draft)
  await page.getByRole("button", { name: /ubah status/i }).click();
  await page.getByLabel(/alasan perubahan status/i).fill("Membatalkan aktivasi tahun ajaran");
  await page.getByPlaceholder('Ketik "Draft"').fill("Draft");
  await expect(page.getByRole("button", { name: /^konfirmasi$/i })).toBeEnabled({ timeout: 6000 });
  await page.getByRole("button", { name: /^konfirmasi$/i }).click();
  await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();

  // Re-transition back to Active so the rest of the test proceeds as expected
  await page.getByRole("button", { name: /ubah status/i }).click();
  await page.getByLabel(/alasan perubahan status/i).fill("Alasan transisi ke aktif yang sah");
  await page.getByRole("button", { name: /^konfirmasi$/i }).click();
  await expect(page.getByText("Aktif", { exact: true }).first()).toBeVisible();

  // We are currently in the edit year modal.
  // Click "Versi Kurikulum" tab
  await page.getByRole("button", { name: /versi kurikulum/i }).click();

  // Add a curriculum version
  await page.getByPlaceholder("Nama versi kurikulum").fill("Kurikulum Merdeka");
  await page.getByRole("button", { name: /^tambah$/i }).click();
  await expect(page.getByText("Kurikulum Merdeka")).toBeVisible();

  // Close the edit year modal
  await page.getByRole("button", { name: /tutup/i }).click();

  // Go to subjects settings page
  await page.goto("/settings/academic/subjects");

  // Select Year and Curriculum version to list subjects
  await page.getByRole("combobox").filter({ hasText: "Pilih tahun ajaran" }).click();
  await page.getByRole("option", { name: /2026\/2027/ }).click();

  await page.getByRole("combobox").filter({ hasText: "Pilih versi kurikulum" }).click();
  await page.getByRole("option", { name: "Kurikulum Merdeka" }).click();

  // Add a subject
  await page.getByRole("button", { name: /tambah mapel/i }).click();
  await page.getByLabel("Nama").fill("Matematika");
  await page.getByLabel("Kode").fill("MTK");
  await page.getByLabel("KKM").fill("75");
  await page.getByRole("button", { name: /^simpan$/i }).click();
  await expect(page.getByRole("cell", { name: "75" })).toBeVisible();

  // Go back to years settings page to manage grading policy
  await page.goto("/settings/academic/years");
  await page.getByRole("button", { name: /aksi/i }).click();
  await page.getByRole("menuitem", { name: /edit/i }).click();

  // Click "Kebijakan Nilai" tab
  await page.getByRole("button", { name: /kebijakan nilai/i }).click();

  // Update policies
  await page.getByLabel(/min. kelulusan/i).fill("76");
  await page.getByLabel(/skala/i).click();
  await page.getByRole("option", { name: "0-100" }).click();
  await page.getByRole("button", { name: /simpan kebijakan/i }).click();
  await expect(page.getByText("Kebijakan nilai disimpan.")).toBeVisible();

  // Close modal
  await page.getByRole("button", { name: /tutup/i }).click();

  await page.goto("/settings/academic/class-templates");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: /2026\/2027/ }).click();
  await page.getByRole("button", { name: /tambah template/i }).click();
  await page.getByLabel("Tingkat").fill("Kelas 7");
  await page.getByLabel("Kapasitas").fill("32");
  await page.getByRole("button", { name: /^simpan$/i }).click();
  await expect(page.getByText("Kelas 7")).toBeVisible();
  await expect(page.getByRole("cell", { name: "32" })).toBeVisible();
});

test("term CRUD and status transition flow", async ({ page }) => {
  await seedAuth(page);
  await mockApis(page);

  // Create a year first
  await page.goto("/settings/academic/years");
  await page.getByRole("button", { name: /buat tahun ajaran/i }).click();
  await page.getByLabel("Nama").fill("2026/2027");
  await page.getByLabel(/tanggal mulai/i).click();
  await pickFirstCalendarDate(page);
  await page.getByLabel(/tanggal selesai/i).click();
  await pickFirstCalendarDate(page);
  await page.getByRole("button", { name: /^simpan$/i }).click();
  await expect(page.getByText("2026/2027")).toBeVisible();

  // Open edit modal and go to Semester tab
  await page.getByRole("button", { name: /aksi/i }).click();
  await page.getByRole("menuitem", { name: /edit/i }).click();
  await page.getByRole("button", { name: /semester/i }).click();

  // Add Semester 1
  await page.getByPlaceholder("Semester 1").fill("Semester 1");
  await page.getByLabel(/mulai/i).first().click();
  await pickFirstCalendarDate(page);
  await page.getByLabel(/selesai/i).first().click();
  await pickFirstCalendarDate(page);
  await page.getByRole("button", { name: /^\+$|^<svg/i }).last().click();
  await expect(page.getByText("Semester 1")).toBeVisible();

  // Add Semester 2
  await page.getByPlaceholder("Semester 1").fill("Semester 2");
  await page.getByLabel(/mulai/i).first().click();
  await pickFirstCalendarDate(page);
  await page.getByLabel(/selesai/i).first().click();
  await pickFirstCalendarDate(page);
  await page.getByRole("button", { name: /^\+$|^<svg/i }).last().click();
  await expect(page.getByText("Semester 2")).toBeVisible();

  // Transition Semester 1 to Active using status dialog
  const sem1Row = page.locator("div").filter({ hasText: /^Semester 1/ }).first();
  await sem1Row.getByRole("combobox").selectOption({ label: /aktif/i });
  await sem1Row.getByRole("button", { name: /ubah/i }).click();
  await page.getByLabel(/alasan perubahan status/i).fill("Semester 1 resmi dimulai hari ini");
  await page.getByRole("button", { name: /^konfirmasi$/i }).click();
  await expect(page.getByText("Status semester diperbarui.")).toBeVisible();

  // Delete Semester 2
  const sem2Row = page.locator("div").filter({ hasText: /^Semester 2/ }).first();
  await sem2Row.getByRole("button", { name: /hapus/i }).click();
  await expect(page.getByText("Semester dihapus.")).toBeVisible();
  await expect(page.getByText("Semester 2")).not.toBeVisible();
});

test("header shows no-active-term warning when year is Active but no term is Active", async ({ page }) => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const academicYearId = "22222222-2222-4222-8222-222222222222";
  const termId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "playwright-access-token");
    window.localStorage.setItem("akademiq.refresh_token", "playwright-refresh-token");
  });

  const corsH = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, accept",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  };
  const ok = async (route: Parameters<Parameters<typeof page.route>[1]>[0], data: unknown) => {
    await route.fulfill({
      status: 200,
      headers: { ...corsH, "Content-Type": "application/json" },
      body: JSON.stringify({ data, meta: {} }),
    });
  };

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (method === "OPTIONS") { await route.fulfill({ status: 204, headers: corsH }); return; }
    if (path === "/api/v1/iam/me") {
      await ok(route, { user_id: "u1", email: "a@b.c", full_name: "Admin", status: "active", memberships: [{ tenant_id: tenantId, role_code: "tenant_admin" }] });
      return;
    }
    if (path === "/api/v1/billing/tenants/me") {
      await ok(route, { tenant_id: tenantId, school_name: "Test", status: "active", current_plan: { plan_id: "p1", code: "starter", name: "Starter" }, modules: [{ feature_code: "academic_config", plan_entitled: true, enabled: true }] });
      return;
    }
    if (path === "/api/v1/iam/roles/me/permissions") { await ok(route, []); return; }
    if (path === "/api/v1/academic-config/academic-years") {
      await ok(route, [{ academic_year_id: academicYearId, tenant_id: tenantId, name: "2026/2027", start_date: "2026-07-01", end_date: "2027-06-30", status: "Active" }]);
      return;
    }
    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/terms`) {
      await ok(route, [{ term_id: termId, academic_year_id: academicYearId, tenant_id: tenantId, name: "Semester 1", start_date: "2026-07-01", end_date: "2026-12-31", status: "Draft" }]);
      return;
    }
    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/curriculum-versions`) {
      await ok(route, []);
      return;
    }
    await route.fulfill({ status: 500, headers: corsH, body: JSON.stringify({ error: { code: "UNHANDLED", message: path } }) });
  });

  await page.goto("/dashboard");
  await expect(page.getByText(/tidak ada semester aktif/i)).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// Fix 7: Header term selector default-resolution algorithm
// ---------------------------------------------------------------------------
test("header term selector resolves default: Active → today-in-range → first", async ({ page }) => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const academicYearId = "22222222-2222-4222-8222-222222222222";
  const termActive  = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const termToday   = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const termFuture  = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tomorrow  = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const farFuture = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

  const corsH = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, accept",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  };
  const ok = async (route: Parameters<Parameters<typeof page.route>[1]>[0], data: unknown) => {
    await route.fulfill({
      status: 200,
      headers: { ...corsH, "Content-Type": "application/json" },
      body: JSON.stringify({ data, meta: {} }),
    });
  };

  // Scenario A: Active term exists → should be selected
  let termsToServe: AcademicTerm[] = [
    { term_id: termFuture, academic_year_id: academicYearId, tenant_id: tenantId, name: "Sem Future", start_date: tomorrow, end_date: farFuture, status: "Draft" },
    { term_id: termToday,  academic_year_id: academicYearId, tenant_id: tenantId, name: "Sem Today",  start_date: yesterday, end_date: tomorrow,  status: "Draft" },
    { term_id: termActive, academic_year_id: academicYearId, tenant_id: tenantId, name: "Sem Active", start_date: yesterday, end_date: farFuture, status: "Active" },
  ];

  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "playwright-access-token");
    window.localStorage.setItem("akademiq.refresh_token", "playwright-refresh-token");
  });

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    if (method === "OPTIONS") { await route.fulfill({ status: 204, headers: corsH }); return; }
    if (path === "/api/v1/iam/me") {
      await ok(route, { user_id: "u1", email: "a@b.c", full_name: "Admin", status: "active", memberships: [{ tenant_id: tenantId, role_code: "tenant_admin" }] });
      return;
    }
    if (path === "/api/v1/billing/tenants/me") {
      await ok(route, { tenant_id: tenantId, school_name: "Test", status: "active", current_plan: { plan_id: "p1", code: "starter", name: "Starter" }, modules: [{ feature_code: "academic_config", plan_entitled: true, enabled: true }] });
      return;
    }
    if (path === "/api/v1/iam/roles/me/permissions") { await ok(route, []); return; }
    if (path === "/api/v1/academic-config/academic-years") {
      await ok(route, [{ academic_year_id: academicYearId, tenant_id: tenantId, name: "2026/2027", start_date: yesterday, end_date: farFuture, status: "Active" }]);
      return;
    }
    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/terms`) {
      await ok(route, termsToServe);
      return;
    }
    if (path === `/api/v1/academic-config/academic-years/${academicYearId}/curriculum-versions`) {
      await ok(route, []);
      return;
    }
    await route.fulfill({ status: 500, headers: corsH, body: JSON.stringify({ error: { code: "UNHANDLED", message: path } }) });
  });

  await page.goto("/dashboard");
  // Scenario A: Active term → "Sem Active" should be selected in the header
  await expect(page.getByRole("combobox", { name: /pilih semester/i }).or(
    page.locator('[data-testid="term-select"]')
  ).filter({ hasText: "Sem Active" })).toBeVisible({ timeout: 10000 });

  // Scenario B: No Active term, but today-in-range term exists → "Sem Today"
  termsToServe = [
    { term_id: termFuture, academic_year_id: academicYearId, tenant_id: tenantId, name: "Sem Future", start_date: tomorrow, end_date: farFuture, status: "Draft" },
    { term_id: termToday,  academic_year_id: academicYearId, tenant_id: tenantId, name: "Sem Today",  start_date: yesterday, end_date: tomorrow,  status: "Draft" },
    { term_id: termActive, academic_year_id: academicYearId, tenant_id: tenantId, name: "Sem Active", start_date: yesterday, end_date: farFuture, status: "Closed" },
  ];
  // Clear stored scope so resolution runs fresh
  await page.evaluate((tid) => {
    localStorage.removeItem(`akademiq.academic_scope.${tid}`);
  }, tenantId);
  await page.reload();
  await expect(page.locator("button, [role=combobox]").filter({ hasText: "Sem Today" })).toBeVisible({ timeout: 10000 });

  // Scenario C: No Active, none in-range → first term (Sem Future by start_date)
  termsToServe = [
    { term_id: termFuture, academic_year_id: academicYearId, tenant_id: tenantId, name: "Sem Future", start_date: farFuture, end_date: farFuture, status: "Draft" },
    { term_id: termActive, academic_year_id: academicYearId, tenant_id: tenantId, name: "Sem Active", start_date: tomorrow, end_date: farFuture, status: "Closed" },
  ];
  await page.evaluate((tid) => {
    localStorage.removeItem(`akademiq.academic_scope.${tid}`);
  }, tenantId);
  await page.reload();
  // resolveDefaultTerm returns terms[0] — first element returned by API
  await expect(page.locator("button, [role=combobox]").filter({ hasText: "Sem Future" })).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// Fix 8: Backward / type-to-confirm / cooldown / Archived term transitions
// ---------------------------------------------------------------------------
test("term backward and Archived status transitions with type-to-confirm and cooldown", async ({ page }) => {
  await seedAuth(page);
  await mockApis(page);

  // Create a year and navigate to Semester tab
  await page.goto("/settings/academic/years");
  await page.getByRole("button", { name: /buat tahun ajaran/i }).click();
  await page.getByLabel("Nama").fill("2026/2027");
  await page.getByLabel(/tanggal mulai/i).click();
  await pickFirstCalendarDate(page);
  await page.getByLabel(/tanggal selesai/i).click();
  await pickFirstCalendarDate(page);
  await page.getByRole("button", { name: /^simpan$/i }).click();
  await expect(page.getByText("2026/2027")).toBeVisible();

  await page.getByRole("button", { name: /aksi/i }).click();
  await page.getByRole("menuitem", { name: /edit/i }).click();
  await page.getByRole("button", { name: /semester/i }).click();

  // Add Semester 1 (auto-seeded as Draft via mock)
  await page.getByPlaceholder("Semester 1").fill("Semester 1");
  await page.getByLabel(/mulai/i).first().click();
  await pickFirstCalendarDate(page);
  await page.getByLabel(/selesai/i).first().click();
  await pickFirstCalendarDate(page);
  await page.getByRole("button", { name: /^\+$|^<svg/i }).last().click();
  await expect(page.getByText("Semester 1")).toBeVisible();

  // Forward: Draft → Active
  const sem1Row = page.locator("div").filter({ hasText: /^Semester 1/ }).first();
  await sem1Row.getByRole("combobox").selectOption({ label: /aktif/i });
  await sem1Row.getByRole("button", { name: /ubah/i }).click();
  await page.getByLabel(/alasan perubahan status/i).fill("Semester 1 resmi dimulai");
  await page.getByRole("button", { name: /^konfirmasi$/i }).click();
  await expect(page.getByText("Status semester diperbarui.")).toBeVisible();

  // Forward: Active → Closed
  await sem1Row.getByRole("combobox").selectOption({ label: /ditutup/i });
  await sem1Row.getByRole("button", { name: /ubah/i }).click();
  await page.getByLabel(/alasan perubahan status/i).fill("Menutup semester satu sekarang");
  await page.getByRole("button", { name: /^konfirmasi$/i }).click();
  await expect(page.getByText("Status semester diperbarui.")).toBeVisible();

  // Backward: Closed → Active (requires type-to-confirm + cooldown)
  await sem1Row.getByRole("combobox").selectOption({ label: /aktif/i });
  await sem1Row.getByRole("button", { name: /ubah/i }).click();
  await page.getByLabel(/alasan perubahan status/i).fill("Membuka kembali semester satu");
  // type-to-confirm: button must be disabled before typing
  const confirmBtn = page.getByRole("button", { name: /^konfirmasi$/i });
  await expect(confirmBtn).toBeDisabled();
  await page.getByPlaceholder(/ketik "active"/i).fill("Active");
  // cooldown: still disabled until timer elapses
  await expect(confirmBtn).toBeDisabled();
  await expect(confirmBtn).toBeEnabled({ timeout: 8000 });
  await confirmBtn.click();
  await expect(page.getByText("Status semester diperbarui.")).toBeVisible();

  // Forward again: Active → Closed → Archived (Archived requires type-to-confirm + cooldown)
  await sem1Row.getByRole("combobox").selectOption({ label: /ditutup/i });
  await sem1Row.getByRole("button", { name: /ubah/i }).click();
  await page.getByLabel(/alasan perubahan status/i).fill("Menutup semester satu lagi");
  await page.getByRole("button", { name: /^konfirmasi$/i }).click();
  await expect(page.getByText("Status semester diperbarui.")).toBeVisible();

  await sem1Row.getByRole("combobox").selectOption({ label: /arsip/i });
  await sem1Row.getByRole("button", { name: /ubah/i }).click();
  await page.getByLabel(/alasan perubahan status/i).fill("Mengarsipkan semester satu");
  await expect(confirmBtn).toBeDisabled();
  await page.getByPlaceholder(/ketik "archived"/i).fill("Archived");
  await expect(confirmBtn).toBeDisabled();
  await expect(confirmBtn).toBeEnabled({ timeout: 8000 });
  await confirmBtn.click();
  await expect(page.getByText("Status semester diperbarui.")).toBeVisible();

  // After Archived: no more status options (Archived is terminal)
  const archivedRow = page.locator("div").filter({ hasText: /^Semester 1/ }).first();
  await expect(archivedRow.getByRole("combobox")).toHaveCount(0);
});
