import { expect, test } from "@playwright/test";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const YEAR_ID = "00000000-0000-0000-0000-000000000101";
const HOMEROOM_ID = "00000000-0000-0000-0000-000000000401";
const CURRICULUM_ID = "00000000-0000-0000-0000-000000000201";
const CARD_DRAFT_ID = "00000000-0000-0000-0000-000000000901";
const CARD_PUBLISHED_ID = "00000000-0000-0000-0000-000000000902";
const STUDENT_A_ID = "00000000-0000-0000-0000-000000000701";
const STUDENT_B_ID = "00000000-0000-0000-0000-000000000702";
const SUBJECT_MATH_ID = "00000000-0000-0000-0000-000000000301";
const SUBJECT_SCIENCE_ID = "00000000-0000-0000-0000-000000000302";
const TEACHER_ID = "00000000-0000-0000-0000-000000000501";
const TEACHER_USER_ID = "00000000-0000-0000-0000-000000000601";

function setupAuthRoutes(page: import("@playwright/test").Page) {
  return Promise.all([
    page.addInitScript(() => {
      window.localStorage.setItem("akademiq.access_token", "test-access");
      window.localStorage.setItem("akademiq.refresh_token", "test-refresh");
    }),
    page.route("**/api/v1/iam/me", (route) =>
      route.fulfill({
        json: {
          data: {
            user_id: "00000000-0000-0000-0000-000000000010",
            email: "homeroom@example.test",
            full_name: "Homeroom Teacher",
            memberships: [],
          },
          meta: {},
        },
      })
    ),
    page.route("**/api/v1/billing/tenants/me", (route) =>
      route.fulfill({
        json: {
          data: {
            tenant_id: TENANT_ID,
            school_name: "Playwright School",
            status: "active",
            current_plan: { name: "Standard" },
            modules: [{ feature_code: "grading", plan_entitled: true, enabled: true }],
          },
          meta: {},
        },
      })
    ),
  ]);
}

test("report-cards staff board renders status columns and generate button", async ({ page }) => {
  await setupAuthRoutes(page);

  await page.route("**/api/v1/academic-config/academic-years", (route) =>
    route.fulfill({
      json: {
        data: [{ academic_year_id: YEAR_ID, name: "2026/2027", status: "Active", start_date: "2026-07-01", end_date: "2027-06-30" }],
        meta: {},
      },
    })
  );
  await page.route("**/api/v1/academic-ops/homerooms", (route) =>
    route.fulfill({
      json: {
        data: [{ homeroom_id: HOMEROOM_ID, name: "8A", grade_level: "8", capacity: 32, academic_year_id: YEAR_ID }],
        meta: {},
      },
    })
  );
  await page.route(`**/api/v1/academic-ops/homerooms/${HOMEROOM_ID}/students`, (route) =>
    route.fulfill({
      json: {
        data: [
          { student_id: STUDENT_A_ID, nis: "S001", full_name: "Andi Pratama", gender: "M", birth_date: "2012-01-01" },
          { student_id: STUDENT_B_ID, nis: "S002", full_name: "Siti Aminah", gender: "F", birth_date: "2012-02-01" },
        ],
        meta: {},
      },
    })
  );
  await page.route(`**/api/v1/grading/report-cards?*`, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            report_card_id: CARD_DRAFT_ID,
            student_id: STUDENT_A_ID,
            academic_year_id: YEAR_ID,
            homeroom_id: HOMEROOM_ID,
            status: "Draft",
            summary: { average_score: 82.5, pass_count: 2, total_subjects: 3, incomplete: false },
          },
          {
            report_card_id: CARD_PUBLISHED_ID,
            student_id: STUDENT_B_ID,
            academic_year_id: YEAR_ID,
            homeroom_id: HOMEROOM_ID,
            status: "Published",
            summary: { average_score: 90.0, pass_count: 3, total_subjects: 3, incomplete: false },
          },
        ],
        meta: {},
      },
    })
  );

  await page.goto("/grading/report-cards");

  // Select year and homeroom
  await page.getByRole("combobox").nth(0).click();
  await page.getByRole("option", { name: "2026/2027" }).click();
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: "8A" }).click();

  // Board renders columns for all 5 statuses
  await expect(page.getByRole("heading", { name: /Draft/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Review Wali Kelas/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Persetujuan Kepala Sekolah/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Terbit/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Arsip/ })).toBeVisible();

  // Draft card visible with Submit action
  await expect(page.getByText("Andi Pratama")).toBeVisible();
  await expect(page.getByText("Siti Aminah")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();

  // Generate Draft button present
  await expect(page.getByRole("button", { name: "Generate Draft" })).toBeVisible();
});

test("generate draft button calls generate endpoint and shows toast", async ({ page }) => {
  await setupAuthRoutes(page);

  await page.route("**/api/v1/academic-config/academic-years", (route) =>
    route.fulfill({
      json: {
        data: [{ academic_year_id: YEAR_ID, name: "2026/2027", status: "Active", start_date: "2026-07-01", end_date: "2027-06-30" }],
        meta: {},
      },
    })
  );
  await page.route("**/api/v1/academic-ops/homerooms", (route) =>
    route.fulfill({
      json: {
        data: [{ homeroom_id: HOMEROOM_ID, name: "8A", grade_level: "8", capacity: 32, academic_year_id: YEAR_ID }],
        meta: {},
      },
    })
  );
  await page.route(`**/api/v1/academic-ops/homerooms/${HOMEROOM_ID}/students`, (route) =>
    route.fulfill({ json: { data: [{ student_id: STUDENT_A_ID, nis: "S001", full_name: "Andi Pratama", gender: "M", birth_date: "2012-01-01" }], meta: {} } })
  );
  await page.route(`**/api/v1/grading/report-cards?*`, (route) =>
    route.fulfill({ json: { data: [], meta: {} } })
  );
  await page.route("**/api/v1/grading/report-cards/generate", (route) => {
    expect(route.request().method()).toBe("POST");
    const body = route.request().postDataJSON();
    expect(body.homeroom_id).toBe(HOMEROOM_ID);
    return route.fulfill({
      status: 201,
      json: {
        data: {
          generated: [
            {
              report_card_id: CARD_DRAFT_ID,
              student_id: STUDENT_A_ID,
              academic_year_id: YEAR_ID,
              homeroom_id: HOMEROOM_ID,
              status: "Draft",
              summary: { average_score: null, pass_count: 0, total_subjects: 0, incomplete: true },
            },
          ],
          skipped: [],
        },
        meta: {},
      },
    });
  });

  await page.goto("/grading/report-cards");

  await page.getByRole("combobox").nth(0).click();
  await page.getByRole("option", { name: "2026/2027" }).click();
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: "8A" }).click();

  await page.getByRole("button", { name: "Generate Draft" }).click();
  await expect(page.getByText(/1 draft dibuat/)).toBeVisible();
});

test("report-card detail page shows grades, pass/fail, and approval history", async ({ page }) => {
  await setupAuthRoutes(page);

  await page.route(`**/api/v1/grading/report-cards/${CARD_DRAFT_ID}`, (route) =>
    route.fulfill({
      json: {
        data: {
          report_card: {
            report_card_id: CARD_DRAFT_ID,
            student_id: STUDENT_A_ID,
            academic_year_id: YEAR_ID,
            homeroom_id: HOMEROOM_ID,
            status: "Draft",
            summary: {
              subjects: [
                { subject_id: SUBJECT_MATH_ID, score: 80, passed: true },
                { subject_id: SUBJECT_SCIENCE_ID, score: 60, passed: false },
              ],
              average_score: 70,
              pass_count: 1,
              total_subjects: 2,
              incomplete: false,
            },
          },
          grades: [
            { grade_id: "g1", student_id: STUDENT_A_ID, subject_id: SUBJECT_MATH_ID, academic_year_id: YEAR_ID, homeroom_id: HOMEROOM_ID, score: 80, recorded_by: TEACHER_USER_ID },
            { grade_id: "g2", student_id: STUDENT_A_ID, subject_id: SUBJECT_SCIENCE_ID, academic_year_id: YEAR_ID, homeroom_id: HOMEROOM_ID, score: 60, recorded_by: TEACHER_USER_ID },
          ],
          approvals: [
            { approval_id: "a1", report_card_id: CARD_DRAFT_ID, approver_id: TEACHER_USER_ID, role: "subject_teacher", action: "submit", approved_at: "2026-06-11T10:00:00Z" },
          ],
        },
        meta: {},
      },
    })
  );
  await page.route(`**/api/v1/academic-ops/homerooms/${HOMEROOM_ID}/students`, (route) =>
    route.fulfill({ json: { data: [{ student_id: STUDENT_A_ID, nis: "S001", full_name: "Andi Pratama", gender: "M", birth_date: "2012-01-01" }], meta: {} } })
  );
  await page.route(`**/api/v1/academic-config/academic-years/${YEAR_ID}/curriculum-versions`, (route) =>
    route.fulfill({ json: { data: [{ curriculum_version_id: CURRICULUM_ID, tenant_id: TENANT_ID, academic_year_id: YEAR_ID, name: "Kurikulum 2026" }], meta: {} } })
  );
  await page.route(`**/api/v1/academic-config/curriculum-versions/${CURRICULUM_ID}/subjects`, (route) =>
    route.fulfill({
      json: {
        data: [
          { subject_id: SUBJECT_MATH_ID, tenant_id: TENANT_ID, curriculum_version_id: CURRICULUM_ID, name: "Matematika", code: "MAT", passing_grade: 75 },
          { subject_id: SUBJECT_SCIENCE_ID, tenant_id: TENANT_ID, curriculum_version_id: CURRICULUM_ID, name: "IPA", code: "IPA", passing_grade: 75 },
        ],
        meta: {},
      },
    })
  );
  await page.route(`**/api/v1/academic-ops/homerooms/${HOMEROOM_ID}/teaching-assignments`, (route) =>
    route.fulfill({
      json: {
        data: [
          { assignment_id: "ta1", teacher_id: TEACHER_ID, subject_id: SUBJECT_MATH_ID, homeroom_id: HOMEROOM_ID, academic_year_id: YEAR_ID },
          { assignment_id: "ta2", teacher_id: TEACHER_ID, subject_id: SUBJECT_SCIENCE_ID, homeroom_id: HOMEROOM_ID, academic_year_id: YEAR_ID },
        ],
        meta: {},
      },
    })
  );
  await page.route("**/api/v1/academic-ops/teachers", (route) =>
    route.fulfill({ json: { data: [{ teacher_id: TEACHER_ID, user_id: TEACHER_USER_ID, nip: "T001", full_name: "Bu Rina" }], meta: {} } })
  );

  await page.goto(`/grading/report-cards/${CARD_DRAFT_ID}`);

  await expect(page.getByText("Detail Rapor")).toBeVisible();
  await expect(page.getByText(/Andi Pratama/)).toBeVisible();
  await expect(page.getByText("Matematika")).toBeVisible();
  await expect(page.getByText("IPA")).toBeVisible();
  await expect(page.getByText("Guru: Bu Rina - Nilai 80")).toBeVisible();
  await expect(page.getByText("Lulus", { exact: true })).toBeVisible();
  await expect(page.getByText("Remedial")).toBeVisible();
  await expect(page.locator("p").filter({ hasText: /^submit$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit ke Wali Kelas" })).toBeVisible();
});
