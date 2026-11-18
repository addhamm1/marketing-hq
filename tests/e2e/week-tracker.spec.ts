import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// W-14: the team week and the department request tracker.
const PIPELINE = "60000000-0000-4000-8000-000000000001";
const BRAND = "40000000-0000-4000-8000-000000000001";
const SALES_DEPT = "10000000-0000-4000-8000-000000000002";
const SALES = "00000000-0000-4000-8000-000000000009";
const APPROVER = "00000000-0000-4000-8000-000000000010";
const COMMUNITY = "00000000-0000-4000-8000-000000000008";
const TRAFFIC = "00000000-0000-4000-8000-000000000003";

// A week far ahead, so this spec never meets real plans. 7 Feb 2032 is a Saturday.
const WEEK = "2032-02-07";
const MONDAY = /Monday,? 9 February/;

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const created: string[] = [];

async function makeCard(stage: "request" | "production" | "confirmation", title: string, extra: Record<string, unknown> = {}) {
  const { data: list } = await svc.from("lists").select("id").eq("board_id", PIPELINE).eq("stage", stage).single();
  const { data, error } = await svc
    .from("cards")
    .insert({
      board_id: PIPELINE, list_id: list!.id, position: `a0${Date.now().toString(36)}`, title, stage, request_kind: "urgent",
      requesting_department_id: SALES_DEPT, requester_id: SALES, approver_id: APPROVER, brand_id: BRAND, platforms: ["instagram"],
      due_at: new Date(Date.now() + 10 * 86_400_000).toISOString(), created_by: TRAFFIC, ...extra,
    })
    .select("id")
    .single();
  if (error) throw error;
  created.push(data.id as string);
  return data.id as string;
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.afterAll(async () => {
  await svc.from("week_plan_entries").delete().gte("day", WEEK).lte("day", "2032-02-12");
  if (created.length) {
    await svc.from("approval_steps").delete().eq("subject_type", "card").in("subject_id", created);
    await svc.from("cards").delete().in("id", created);
  }
});

test("a member plans a field day, sees it on the board and clears it", async ({ page }) => {
  await signIn(page, "community@test.local");
  await page.goto(`/en/week?week=${WEEK}`);
  const row = page.getByTestId(`week-row-${COMMUNITY}`);
  await expect(row).toBeVisible({ timeout: 20_000 });

  await row.getByRole("button", { name: MONDAY }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "In the field" }).click();

  // The place is required for a field day, and the error sits beside the field.
  await dialog.getByRole("button", { name: "Save plan" }).click();
  await expect(dialog.getByText("This field is required")).toBeVisible();

  await dialog.getByLabel("Place name").fill("Zamalek client office");
  await dialog.getByRole("button", { name: "Save plan" }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await expect(row.getByText("Zamalek client office")).toBeVisible({ timeout: 15_000 });

  await row.getByRole("button", { name: MONDAY }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Back to default" }).click();
  await expect(row.getByText("Zamalek client office")).toHaveCount(0, { timeout: 15_000 });
});

test("past days cannot be edited and someone else's row has no edit control", async ({ page }) => {
  await signIn(page, "community@test.local");
  // 3 Jan 2026 is a Saturday in a week that has passed.
  await page.goto("/en/week?week=2026-01-03");
  const row = page.getByTestId(`week-row-${COMMUNITY}`);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy my last week" })).toHaveCount(0);

  await page.goto(`/en/week?week=${WEEK}`);
  const other = page.getByTestId(`week-row-00000000-0000-4000-8000-000000000006`);
  await expect(other).toBeVisible({ timeout: 20_000 });
  await expect(other.getByRole("button")).toHaveCount(0);
});

test("a department sees the team week with a way to request from marketing", async ({ page }) => {
  await signIn(page, "sales@test.local");
  await page.goto(`/en/portal/week?week=${WEEK}`);
  await expect(page.getByRole("heading", { name: "Team week" })).toBeVisible({ timeout: 20_000 });
  const cta = page.getByRole("link", { name: "Request from marketing" });
  await expect(cta).toHaveAttribute("href", /\/portal\/requests\/new$/);
  await expect(page.getByTestId("week-grid").getByRole("rowheader").first()).toBeVisible();
  // Their own row is pinned even though the board defaults to marketing.
  await expect(page.getByTestId(`week-row-${SALES}`)).toBeVisible();
});

test("the tracker flags what needs action and explains progress in plain language", async ({ page }) => {
  const stamp = Date.now();
  const returned = await makeCard("request", `E2E returned ${stamp}`, { returned_reason: "The offer dates are missing" });
  await makeCard("production", `E2E in production ${stamp}`, { stage_due_at: new Date(Date.now() + 3 * 86_400_000).toISOString() });

  await signIn(page, "sales@test.local");
  await page.goto("/en/portal");
  await expect(page.getByTestId("strategic-banner")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("group", { name: "Filter requests" }).getByRole("button", { name: /Needs action/ }).click();
  const needsAction = page.getByTestId("tracker-row").filter({ hasText: `E2E returned ${stamp}` });
  await expect(needsAction.getByText("Needs your action")).toBeVisible();
  await expect(page.getByTestId("tracker-row").filter({ hasText: `E2E in production ${stamp}` })).toHaveCount(0);

  await page.getByRole("group", { name: "Filter requests" }).getByRole("button", { name: /In progress/ }).click();
  const inProgress = page.getByTestId("tracker-row").filter({ hasText: `E2E in production ${stamp}` });
  await expect(inProgress.getByText("The team is working on your request.")).toBeVisible();
  await expect(inProgress.getByText("This step due")).toBeVisible();

  await page.goto(`/en/portal/requests/${returned}`);
  const panel = page.getByTestId("returned-panel");
  await expect(panel.getByRole("heading", { name: "Needs your action: update this request" })).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByText("The offer dates are missing")).toBeVisible();
  await expect(page.getByTestId("tracker-stepper").locator('[aria-current="step"]')).toContainText("Received");
  await expect(page.getByTestId("tracker-timeline")).toContainText("Request received");
  // Internal stage names stay out of what departments read.
  await expect(page.locator("main")).not.toContainText(/creative review|brief schedule|performance input|intake/i);
});

test("only the approver is asked to confirm", async ({ browser, baseURL }) => {
  const id = await makeCard("confirmation", `E2E confirm ${Date.now()}`);
  const { error } = await svc
    .from("approval_steps")
    .insert({ subject_type: "card", subject_id: id, card_stage: "confirmation", step_index: 0, approver_id: APPROVER, status: "active" });
  expect(error).toBeNull();

  const approverPage = await (await browser.newContext({ baseURL })).newPage();
  await signIn(approverPage, "approver@test.local");
  await approverPage.goto(`/en/portal/requests/${id}`);
  await expect(approverPage.getByRole("heading", { name: "Needs your action: confirm the work" })).toBeVisible({ timeout: 20_000 });

  const colleague = await (await browser.newContext({ baseURL })).newPage();
  await signIn(colleague, "sales@test.local");
  await colleague.goto(`/en/portal/requests/${id}`);
  await expect(colleague.getByTestId("tracker-stepper")).toBeVisible({ timeout: 20_000 });
  await expect(colleague.getByRole("heading", { name: "Needs your action: confirm the work" })).toHaveCount(0);
  await expect(colleague.getByText(/Waiting for .+ to confirm the work/)).toBeVisible();
});

test.describe("at 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("the week becomes a day list with no sideways scroll, in both languages", async ({ page }) => {
    await signIn(page, "community@test.local");
    await page.goto(`/en/week?week=${WEEK}`);
    const list = page.getByTestId("week-day-list");
    await expect(list).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("week-grid")).toBeHidden();
    await list.getByRole("button", { name: /Mon/ }).first().click();
    await expect(list.getByRole("heading", { name: MONDAY })).toBeVisible();
    await noOverflow(page);

    await page.goto(`/ar/week?week=${WEEK}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "أسبوع الفريق" })).toBeVisible({ timeout: 20_000 });
    await noOverflow(page);
  });

  test("the portal pages fit a phone, in both languages", async ({ page }) => {
    await signIn(page, "sales@test.local");
    for (const path of ["/en/portal", "/ar/portal", "/en/portal/week", "/ar/portal/week"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/Something went wrong|حدث خطأ/)).toHaveCount(0);
      await noOverflow(page);
    }
  });
});
