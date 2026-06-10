import { expect, test } from "@playwright/test";

test("teacher fills the grade grid for a class", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "test-access");
    window.localStorage.setItem("akademiq.refresh_token", "test-refresh");
  });

  await page.route("**/api/v1/iam/me", async (route) => {
    await route.fulfill({ json: { data: { user_id: "00000000-0000-0000-0000-000000000010", email: "teacher@example.test", full_name: "Teacher User", memberships: [] }, meta: {} } });
  });
  await page.route("**/api/v1/billing/tenants/me", async (route) => {
    await route.fulfill({ json: { data: { tenant_id: "00000000-0000-0000-0000-000000000001", school_name: "Playwright School", status: "active", current_plan: { name: "Standard" }, modules: [{ feature_code: "grading", plan_entitled: true, enabled: true }] }, meta: {} } });
  });
  await page.route("**/api/v1/academic-config/academic-years", async (route) => {
    await route.fulfill({ json: { data: [{ academic_year_id: "00000000-0000-0000-0000-000000000101", name: "2026/2027", status: "Active", start_date: "2026-07-01", end_date: "2027-06-30" }], meta: {} } });
  });
  await page.route("**/api/v1/academic-config/academic-years/*/curriculum-versions", async (route) => {
    await route.fulfill({ json: { data: [{ curriculum_version_id: "00000000-0000-0000-0000-000000000201", name: "Merdeka" }], meta: {} } });
  });
  await page.route("**/api/v1/academic-config/curriculum-versions/*/subjects", async (route) => {
    await route.fulfill({ json: { data: [{ subject_id: "00000000-0000-0000-0000-000000000301", name: "Matematika", passing_grade: 75 }], meta: {} } });
  });
  await page.route("**/api/v1/academic-ops/homerooms", async (route) => {
    await route.fulfill({ json: { data: [{ homeroom_id: "00000000-0000-0000-0000-000000000401", name: "8A", grade_level: "8", capacity: 32, academic_year_id: "00000000-0000-0000-0000-000000000101" }], meta: {} } });
  });
  await page.route("**/api/v1/academic-ops/homerooms/*/teaching-assignments", async (route) => {
    await route.fulfill({ json: { data: [{ assignment_id: "00000000-0000-0000-0000-000000000501", teacher_id: "00000000-0000-0000-0000-000000000601", subject_id: "00000000-0000-0000-0000-000000000301", homeroom_id: "00000000-0000-0000-0000-000000000401", academic_year_id: "00000000-0000-0000-0000-000000000101" }], meta: {} } });
  });
  await page.route("**/api/v1/academic-ops/homerooms/*/students", async (route) => {
    await route.fulfill({ json: { data: [{ student_id: "00000000-0000-0000-0000-000000000701", nis: "S-001", full_name: "Student One" }], meta: {} } });
  });
  await page.route("**/api/v1/grading/grades?*", async (route) => {
    await route.fulfill({ json: { data: [], meta: {} } });
  });
  await page.route("**/api/v1/grading/grades", async (route) => {
    expect(route.request().method()).toBe("POST");
    const body = route.request().postDataJSON();
    expect(body.score).toBe(88);
    await route.fulfill({ status: 201, json: { data: { grade_id: "00000000-0000-0000-0000-000000000801", ...body, homeroom_id: "00000000-0000-0000-0000-000000000401", recorded_by: "00000000-0000-0000-0000-000000000010" }, meta: {} } });
  });

  await page.goto("/grading/entry");
  await page.getByRole("combobox").nth(0).click();
  await page.getByRole("option", { name: "2026/2027" }).click();
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: "8A" }).click();
  await page.getByRole("combobox").nth(2).click();
  await page.getByRole("option", { name: "Matematika" }).click();
  await expect(page.getByText("Student One")).toBeVisible();
  await page.getByPlaceholder("0-100").fill("88");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText("Nilai Student One disimpan.")).toBeVisible();
});
