import { expect, Page, test } from "@playwright/test";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, accept",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

const SUBJECT_ID = "44444444-4444-4444-8444-444444444444";

async function seedAuth(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "playwright-access-token");
    window.localStorage.setItem("akademiq.refresh_token", "playwright-refresh-token");
  });
}

async function mockApis(page: Page) {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const yearId = "22222222-2222-4222-8222-222222222222";
  const curriculumId = "33333333-3333-4333-8333-333333333333";
  const subjectId = SUBJECT_ID;
  const studentId = "55555555-5555-4555-8555-555555555555";
  const teacherId = "66666666-6666-4666-8666-666666666666";
  const homeroomId = "77777777-7777-4777-8777-777777777777";
  const students: Array<Record<string, unknown>> = [];
  const teachers: Array<Record<string, unknown>> = [];
  const homerooms: Array<Record<string, unknown>> = [];
  const roster: Array<Record<string, unknown>> = [];
  const assignments: Array<Record<string, unknown>> = [];

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: corsHeaders });
    const ok = (data: unknown, status = 200) => route.fulfill({ status, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ data, meta: {} }) });

    if (path === "/api/v1/iam/me") return ok({ user_id: "99999999-9999-4999-8999-999999999999", email: "admin@akademiq.test", full_name: "Tenant Admin", status: "active", memberships: [{ tenant_id: tenantId, role_code: "tenant_admin" }] });
    if (path === "/api/v1/iam/tenants/me/permissions") return ok([{ code: "academic.ops.manage", description: "", held: true }, { code: "academic.config.write", description: "", held: true }]);
    if (path === "/api/v1/billing/tenants/me") return ok({ tenant_id: tenantId, school_name: "Playwright School", status: "active", current_plan: { plan_id: "88888888-8888-4888-8888-888888888888", code: "starter", name: "Starter" }, modules: [{ feature_code: "academic_ops", plan_entitled: true, enabled: true }, { feature_code: "academic_config", plan_entitled: true, enabled: true }] });
    if (path === "/api/v1/academic-config/academic-years") return ok([{ academic_year_id: yearId, tenant_id: tenantId, name: "2026/2027", start_date: "2026-07-01", end_date: "2027-06-30", status: "Active" }]);
    if (path === `/api/v1/academic-config/academic-years/${yearId}/curriculum-versions`) return ok([{ curriculum_version_id: curriculumId, tenant_id: tenantId, academic_year_id: yearId, name: "Kurikulum" }]);
    if (path === `/api/v1/academic-config/curriculum-versions/${curriculumId}/subjects`) return ok([{ subject_id: subjectId, tenant_id: tenantId, curriculum_version_id: curriculumId, name: "Matematika", passing_grade: 75 }]);

    if (path === "/api/v1/academic-ops/students" && method === "GET") return ok(students);
    if (path === "/api/v1/academic-ops/students" && method === "POST") { const body = request.postDataJSON(); const row = { student_id: studentId, tenant_id: tenantId, ...body }; students.push(row); return ok(row, 201); }
    if (path === `/api/v1/academic-ops/students/${studentId}` && method === "PATCH") { Object.assign(students[0], request.postDataJSON()); return ok(students[0]); }
    if (path === "/api/v1/academic-ops/teachers" && method === "GET") return ok(teachers);
    if (path === "/api/v1/academic-ops/teachers" && method === "POST") { const body = request.postDataJSON(); const row = { teacher_id: teacherId, tenant_id: tenantId, ...body }; teachers.push(row); return ok(row, 201); }
    if (path === "/api/v1/academic-ops/homerooms" && method === "GET") return ok(homerooms);
    if (path === "/api/v1/academic-ops/homerooms" && method === "POST") { const body = request.postDataJSON(); const row = { homeroom_id: homeroomId, tenant_id: tenantId, ...body }; homerooms.push(row); return ok(row, 201); }
    if (path === `/api/v1/academic-ops/homerooms/${homeroomId}/students`) return ok(roster);
    if (path === "/api/v1/academic-ops/enrollments") { roster.push(students[0]); return ok({ enrollment_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, 201); }
    if (path === `/api/v1/academic-ops/homerooms/${homeroomId}/teaching-assignments`) return ok(assignments);
    if (path === "/api/v1/academic-ops/teaching-assignments") { const body = request.postDataJSON(); const row = { assignment_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", tenant_id: tenantId, ...body }; assignments.push(row); return ok(row, 201); }
    if (path === "/api/v1/academic-ops/imports/students") return route.fulfill({ status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: { code: "IMPORT_VALIDATION_FAILED", message: "import validation failed" }, rows: [{ row: 2, errors: { nis: ["duplicate in file"] } }] }) });
    return route.fulfill({ status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ error: { code: "UNHANDLED_ROUTE", message: path } }) });
  });
}

test("tenant admin walks academic ops pages including import errors", async ({ page }) => {
  await seedAuth(page);
  await mockApis(page);

  await page.goto("/students");
  await page.getByLabel("NIS").fill("S-001");
  await page.getByLabel("Nama lengkap").fill("Student One");
  await page.getByLabel("Gender").fill("female");
  await page.getByLabel("Tanggal lahir").fill("2012-01-01");
  await page.getByRole("button", { name: /simpan siswa/i }).click();
  await expect(page.getByText("Student One")).toBeVisible();

  await page.goto("/teachers");
  await page.getByLabel("NIP").fill("T-001");
  await page.getByLabel("Nama lengkap").fill("Teacher One");
  await page.getByRole("button", { name: /simpan guru/i }).click();
  await expect(page.getByText("Teacher One")).toBeVisible();

  await page.goto("/homerooms");
  await page.getByLabel("Nama kelas").fill("7A");
  await page.getByLabel("Tingkat").fill("7");
  await page.getByLabel("Kapasitas").fill("32");
  await page.getByRole("combobox", { name: /tahun aktif/i }).click();
  await page.getByRole("option", { name: "2026/2027" }).click();
  await page.getByRole("button", { name: /buat kelas/i }).click();
  await page.getByRole("button", { name: /7A/i }).click();
  await page.getByRole("combobox", { name: /siswa/i }).click();
  await page.getByRole("option", { name: "Student One" }).click();
  await page.getByRole("button", { name: /^enroll$/i }).click();
  await expect(page.getByText("Student One")).toBeVisible();

  await page.goto("/teaching-assignments");
  for (const [label, option] of [[/tahun/i, "2026/2027"], [/kurikulum/i, "Kurikulum"], [/kelas/i, "7A"], [/guru/i, "Teacher One"], [/subject/i, "Matematika"]] as const) {
    await page.getByRole("combobox", { name: label }).click();
    await page.getByRole("option", { name: option }).click();
  }
  await page.getByRole("button", { name: /^assign$/i }).click();
  await expect(page.getByText(SUBJECT_ID)).toBeVisible();

  await page.goto("/import");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "bad.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("bad") });
  await page.getByRole("button", { name: /upload/i }).first().click();
  await expect(page.getByText(/baris 2/i)).toBeVisible();
  await expect(page.getByText(/duplicate in file/i)).toBeVisible();
});
