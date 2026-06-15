import { expect, test } from "@playwright/test";

const YEAR_ID = "00000000-0000-0000-0000-000000000101";
const CURRICULUM_ID = "00000000-0000-0000-0000-000000000201";
const SUBJECT_ID = "00000000-0000-0000-0000-000000000301";
const HOMEROOM_ID = "00000000-0000-0000-0000-000000000401";
const ASSIGNMENT_ID = "00000000-0000-0000-0000-000000000501";
const TEACHER_ID = "00000000-0000-0000-0000-000000000601";
const STUDENT_ID = "00000000-0000-0000-0000-000000000701";
const EVAL_ID = "00000000-0000-0000-0000-000000000901";

const EVAL_FIXTURE = {
  evaluation_id: EVAL_ID,
  tenant_id: "00000000-0000-0000-0000-000000000001",
  homeroom_id: HOMEROOM_ID,
  subject_id: SUBJECT_ID,
  academic_year_id: YEAR_ID,
  code: "UH1",
  name: "Ulangan Harian 1",
  position: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

async function setupCommonRoutes(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "test-access");
    window.localStorage.setItem("akademiq.refresh_token", "test-refresh");
  });

  await page.route("**/api/v1/iam/me", (route) =>
    route.fulfill({
      json: {
        data: { user_id: TEACHER_ID, email: "teacher@example.test", full_name: "Teacher User", memberships: [] },
        meta: {},
      },
    }),
  );

  await page.route("**/api/v1/billing/tenants/me", (route) =>
    route.fulfill({
      json: {
        data: {
          tenant_id: "00000000-0000-0000-0000-000000000001",
          school_name: "Playwright School",
          status: "active",
          current_plan: { name: "Standard" },
          modules: [{ feature_code: "grading", plan_entitled: true, enabled: true }],
        },
        meta: {},
      },
    }),
  );

  await page.route("**/api/v1/academic-config/academic-years*", (route) =>
    route.fulfill({
      json: {
        data: [{ academic_year_id: YEAR_ID, name: "2026/2027", status: "Active", start_date: "2026-07-01", end_date: "2027-06-30" }],
        meta: {},
      },
    }),
  );

  await page.route("**/api/v1/academic-config/academic-years/*/curriculum-versions*", (route) =>
    route.fulfill({
      json: { data: [{ curriculum_version_id: CURRICULUM_ID, name: "Merdeka" }], meta: {} },
    }),
  );

  await page.route("**/api/v1/academic-config/curriculum-versions/*/subjects*", (route) =>
    route.fulfill({
      json: { data: [{ subject_id: SUBJECT_ID, name: "Matematika", passing_grade: 75 }], meta: {} },
    }),
  );

  await page.route("**/api/v1/academic-ops/homerooms*", (route) => {
    if (route.request().url().includes("/students")) {
      return route.fulfill({ json: { data: [{ student_id: STUDENT_ID, nis: "S-001", full_name: "Student One" }], meta: {} } });
    }
    if (route.request().url().includes("/teaching-assignments")) {
      return route.fulfill({
        json: {
          data: [{ assignment_id: ASSIGNMENT_ID, teacher_id: TEACHER_ID, subject_id: SUBJECT_ID, homeroom_id: HOMEROOM_ID, academic_year_id: YEAR_ID }],
          meta: {},
        },
      });
    }
    return route.fulfill({
      json: {
        data: [{ homeroom_id: HOMEROOM_ID, name: "8A", grade_level: "8", capacity: 32, academic_year_id: YEAR_ID }],
        meta: {},
      },
    });
  });
}

async function selectScope(page: import("@playwright/test").Page) {
  await page.goto("/grading/entry");
  await page.getByRole("combobox").nth(0).click();
  await page.getByRole("option", { name: "2026/2027" }).click();
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: "8A" }).click();
  await page.getByRole("combobox").nth(2).click();
  await page.getByRole("option", { name: "Matematika" }).click();
}

test("evaluation columns appear and grade cell auto-saves on blur", async ({ page }) => {
  await setupCommonRoutes(page);

  await page.route("**/api/v1/grading/evaluations*", (route) =>
    route.fulfill({ json: { data: [EVAL_FIXTURE], meta: {} } }),
  );

  await page.route("**/api/v1/grading/grades?*", (route) =>
    route.fulfill({ json: { data: [], meta: {} } }),
  );

  let savedBody: Record<string, unknown> | null = null;
  await page.route("**/api/v1/grading/grades", async (route) => {
    expect(route.request().method()).toBe("POST");
    savedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      json: {
        data: { grade_id: "00000000-0000-0000-0000-000000000801", ...savedBody, recorded_by: TEACHER_ID, created_at: "2026-06-15T00:00:00Z", updated_at: "2026-06-15T00:00:00Z" },
        meta: {},
      },
    });
  });

  await selectScope(page);

  // Evaluation column header should appear
  await expect(page.getByRole("columnheader", { name: "UH1" })).toBeVisible();
  // Student row should be present
  await expect(page.getByText("Student One")).toBeVisible();

  // Fill the cell and blur to trigger auto-save
  const cell = page.getByPlaceholder("—");
  await cell.fill("88");
  await cell.press("Tab");

  // Saved indicator should appear
  await expect(page.locator("span").filter({ hasText: "✓" })).toBeVisible();

  // Verify request body
  expect(savedBody).toMatchObject({
    student_id: STUDENT_ID,
    evaluation_id: EVAL_ID,
    score: 88,
  });
});

test("empty evaluation state shows hint and opens Kelola Evaluasi", async ({ page }) => {
  await setupCommonRoutes(page);

  let evaluations: object[] = [];

  await page.route("**/api/v1/grading/evaluations*", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const created = { evaluation_id: EVAL_ID, tenant_id: "00000000-0000-0000-0000-000000000001", ...body, created_at: "2026-06-15T00:00:00Z", updated_at: "2026-06-15T00:00:00Z" };
      evaluations = [created];
      await route.fulfill({ status: 201, json: { data: created, meta: {} } });
    } else {
      await route.fulfill({ json: { data: evaluations, meta: {} } });
    }
  });

  await page.route("**/api/v1/grading/grades?*", (route) =>
    route.fulfill({ json: { data: [], meta: {} } }),
  );

  await selectScope(page);

  // Empty state should show the hint
  await expect(page.getByText("Belum ada evaluasi untuk kelas+mapel ini.")).toBeVisible();

  // Open the modal via the card header button
  await page.getByRole("button", { name: /Kelola Evaluasi/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Show add form
  await page.getByRole("dialog").getByRole("button", { name: /Tambah Evaluasi/ }).click();

  // Fill new evaluation
  await page.getByRole("dialog").getByPlaceholder("UH1").fill("UH1");
  await page.getByRole("dialog").getByPlaceholder("Ulangan Harian 1").fill("Ulangan Harian 1");

  // Submit
  await page.getByRole("dialog").getByRole("button", { name: "Simpan" }).click();

  // Evaluation should now appear in modal list
  await expect(page.getByRole("dialog").getByText("UH1")).toBeVisible();
});

test("invalid score shows inline error and does not submit", async ({ page }) => {
  await setupCommonRoutes(page);

  await page.route("**/api/v1/grading/evaluations*", (route) =>
    route.fulfill({ json: { data: [EVAL_FIXTURE], meta: {} } }),
  );
  await page.route("**/api/v1/grading/grades?*", (route) =>
    route.fulfill({ json: { data: [], meta: {} } }),
  );

  let gradeCallMade = false;
  await page.route("**/api/v1/grading/grades", () => { gradeCallMade = true; });

  await selectScope(page);
  await expect(page.getByPlaceholder("—")).toBeVisible();

  const cell = page.getByPlaceholder("—");
  await cell.fill("999");
  await cell.press("Tab");

  await expect(page.getByText("Nilai maksimal 100")).toBeVisible();
  expect(gradeCallMade).toBe(false);
});
