import { expect, test } from "@playwright/test";

const STUDENT_ID = "00000000-0000-0000-0000-000000000701";
const YEAR_ID = "00000000-0000-0000-0000-000000000101";
const HOMEROOM_ID = "00000000-0000-0000-0000-000000000401";
const CARD_ID = "00000000-0000-0000-0000-000000000901";

test("parent/student portal shows child selector and published report card", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "test-access");
    window.localStorage.setItem("akademiq.refresh_token", "test-refresh");
  });

  await page.route(/\/api\/v1\/iam\/me/, (route) =>
    route.fulfill({
      json: {
        data: {
          user_id: "00000000-0000-0000-0000-000000000020",
          email: "parent@example.test",
          full_name: "Parent User",
          memberships: [],
        },
        meta: {},
      },
    })
  );
  await page.route(/\/api\/v1\/billing\/tenants\/me/, (route) =>
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
    })
  );
  await page.route(/\/api\/v1\/academic-config\/academic-years/, (route) =>
    route.fulfill({
      json: {
        data: [
          { academic_year_id: YEAR_ID, name: "2023/2024", status: "Active" }
        ],
        meta: {},
      }
    })
  );
  await page.route(/\/api\/v1\/grading\/me\/report-cards(\?|$)/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            report_card_id: CARD_ID,
            student_id: STUDENT_ID,
            academic_year_id: YEAR_ID,
            homeroom_id: HOMEROOM_ID,
            status: "Published",
          }
        ],
        meta: {},
      }
    })
  );
  await page.route(new RegExp(`/api/v1/grading/me/report-cards/${STUDENT_ID}`), (route) =>
    route.fulfill({
      json: {
        data: {
          report_card: {
            report_card_id: CARD_ID,
            student_id: STUDENT_ID,
            academic_year_id: YEAR_ID,
            homeroom_id: HOMEROOM_ID,
            status: "Published",
            summary: {
              subjects: [
                { subject_id: "00000000-0000-0000-0000-000000000301", score: 88, passed: true },
                { subject_id: "00000000-0000-0000-0000-000000000302", score: 72, passed: false },
              ],
              average_score: 80,
              pass_count: 1,
              total_subjects: 2,
              incomplete: false,
            },
            published_at: "2026-06-11T12:00:00Z",
          },
          grades: [],
          subject_scores: [
            { report_card_id: CARD_ID, subject_id: "00000000-0000-0000-0000-000000000301", final_score: 88, computed_at: "2026-06-11T12:00:00Z" },
            { report_card_id: CARD_ID, subject_id: "00000000-0000-0000-0000-000000000302", final_score: 72, computed_at: "2026-06-11T12:00:00Z" },
          ],
          approvals: [],
        },
        meta: {},
      },
    })
  );

  await page.goto(`/portal/report-card?student_id=${STUDENT_ID}&academic_year_id=${YEAR_ID}`);

  await expect(page.getByText("Rapor Terbit")).toBeVisible();
  
  // Free text input is not rendered anymore
  await expect(page.locator("input[placeholder='student_id']")).toHaveCount(0);
  
  // Selector "Pilih Anak" should render, and show Siswa #0701
  await expect(page.locator("#student-select")).toBeVisible();
  await expect(page.locator("#student-select")).toContainText("Siswa #0701");

  await expect(page.getByText("Published")).toBeVisible();

  // Shows pass/fail for each subject
  await expect(page.getByText("88")).toBeVisible();
  await expect(page.getByText("72")).toBeVisible();
  await expect(page.getByText("Lulus")).toBeVisible();
  await expect(page.getByText("Remedial")).toBeVisible();

  // No edit/transition controls visible
  await expect(page.getByRole("button", { name: /Submit|Approve|Publish/ })).toHaveCount(0);
});

test("portal shows empty state when parent has no linked students", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "test-access");
    window.localStorage.setItem("akademiq.refresh_token", "test-refresh");
  });

  await page.route(/\/api\/v1\/iam\/me/, (route) =>
    route.fulfill({
      json: {
        data: { user_id: "00000000-0000-0000-0000-000000000021", email: "student@example.test", full_name: "Student User", memberships: [] },
        meta: {},
      },
    })
  );
  await page.route(/\/api\/v1\/billing\/tenants\/me/, (route) =>
    route.fulfill({
      json: {
        data: {
          tenant_id: "00000000-0000-0000-0000-000000000001",
          school_name: "Playwright School",
          status: "active",
          current_plan: { name: "Standard" },
          modules: [],
        },
        meta: {},
      },
    })
  );
  await page.route(/\/api\/v1\/academic-config\/academic-years/, (route) =>
    route.fulfill({
      json: {
        data: [
          { academic_year_id: YEAR_ID, name: "2023/2024", status: "Active" }
        ],
        meta: {},
      }
    })
  );
  // Empty cards list
  await page.route(/\/api\/v1\/grading\/me\/report-cards(\?|$)/, (route) =>
    route.fulfill({ json: { data: [], meta: {} } })
  );

  await page.goto(`/portal/report-card?academic_year_id=${YEAR_ID}`);

  await expect(page.getByText("Belum ada siswa terhubung")).toBeVisible();
});

test("portal shows access denied alert on non-owned deep link", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "test-access");
    window.localStorage.setItem("akademiq.refresh_token", "test-refresh");
  });

  await page.route(/\/api\/v1\/iam\/me/, (route) =>
    route.fulfill({
      json: {
        data: { user_id: "00000000-0000-0000-0000-000000000020", email: "parent@example.test", full_name: "Parent User", memberships: [] },
        meta: {},
      },
    })
  );
  await page.route(/\/api\/v1\/billing\/tenants\/me/, (route) =>
    route.fulfill({
      json: {
        data: {
          tenant_id: "00000000-0000-0000-0000-000000000001",
          school_name: "Playwright School",
          status: "active",
        },
        meta: {},
      },
    })
  );
  await page.route(/\/api\/v1\/academic-config\/academic-years/, (route) =>
    route.fulfill({
      json: {
        data: [
          { academic_year_id: YEAR_ID, name: "2023/2024", status: "Active" }
        ],
        meta: {},
      }
    })
  );
  // Report card list only returns CARD_ID (STUDENT_ID)
  await page.route(/\/api\/v1\/grading\/me\/report-cards(\?|$)/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            report_card_id: CARD_ID,
            student_id: STUDENT_ID,
            academic_year_id: YEAR_ID,
            homeroom_id: HOMEROOM_ID,
            status: "Published",
          }
        ],
        meta: {},
      }
    })
  );

  // Accessing an unowned student ID
  await page.goto(`/portal/report-card?student_id=unowned-student-123&academic_year_id=${YEAR_ID}`);

  await expect(page.getByText("Akses Ditolak")).toBeVisible();
  await expect(page.getByText("Anda tidak memiliki akses ke rapor siswa ini.")).toBeVisible();
});
