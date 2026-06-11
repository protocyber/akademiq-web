import { expect, test } from "@playwright/test";

const STUDENT_ID = "00000000-0000-0000-0000-000000000701";
const YEAR_ID = "00000000-0000-0000-0000-000000000101";
const HOMEROOM_ID = "00000000-0000-0000-0000-000000000401";
const CARD_ID = "00000000-0000-0000-0000-000000000901";

test("parent/student portal shows published report card read-only", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "test-access");
    window.localStorage.setItem("akademiq.refresh_token", "test-refresh");
  });

  await page.route("**/api/v1/iam/me", (route) =>
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
    })
  );
  await page.route(`**/api/v1/grading/students/${STUDENT_ID}/report-card?*`, (route) =>
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
          grades: [
            { grade_id: "g1", student_id: STUDENT_ID, subject_id: "00000000-0000-0000-0000-000000000301", academic_year_id: YEAR_ID, homeroom_id: HOMEROOM_ID, score: 88, recorded_by: "t1" },
            { grade_id: "g2", student_id: STUDENT_ID, subject_id: "00000000-0000-0000-0000-000000000302", academic_year_id: YEAR_ID, homeroom_id: HOMEROOM_ID, score: 72, recorded_by: "t1" },
          ],
          approvals: [],
        },
        meta: {},
      },
    })
  );

  await page.goto(`/portal/report-card?student_id=${STUDENT_ID}&academic_year_id=${YEAR_ID}`);

  await expect(page.getByText("Rapor Terbit")).toBeVisible();
  await expect(page.getByText("Published")).toBeVisible();

  // Shows pass/fail for each subject
  await expect(page.getByText("88")).toBeVisible();
  await expect(page.getByText("72")).toBeVisible();
  await expect(page.getByText("Lulus")).toBeVisible();
  await expect(page.getByText("Remedial")).toBeVisible();

  // No edit/transition controls visible
  await expect(page.getByRole("button", { name: /Submit|Approve|Publish/ })).toHaveCount(0);
});

test("portal shows not-available alert when card not published", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("akademiq.access_token", "test-access");
    window.localStorage.setItem("akademiq.refresh_token", "test-refresh");
  });

  await page.route("**/api/v1/iam/me", (route) =>
    route.fulfill({
      json: {
        data: { user_id: "00000000-0000-0000-0000-000000000021", email: "student@example.test", full_name: "Student User", memberships: [] },
        meta: {},
      },
    })
  );
  await page.route("**/api/v1/billing/tenants/me", (route) =>
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
  await page.route(`**/api/v1/grading/students/${STUDENT_ID}/report-card?*`, (route) =>
    route.fulfill({ status: 404, json: { error: { code: "NOT_FOUND", message: "not found" } } })
  );

  await page.goto(`/portal/report-card?student_id=${STUDENT_ID}&academic_year_id=${YEAR_ID}`);

  await expect(page.getByText(/Rapor belum tersedia|belum dipublikasikan/)).toBeVisible();
});
