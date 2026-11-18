import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// W-12: the month at a glance. Uses a month of its own and removes it afterwards.
const at = new Date();
const target = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 7, 1));
const MONTH = target.toISOString().slice(0, 7);

const svc = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

async function clearMonth() {
  await svc().from("gate_item_exclusions").delete().eq("month", `${MONTH}-01`);
  await svc().from("gate_items").delete().eq("month", `${MONTH}-01`);
}

async function expectNoSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.beforeEach(clearMonth);
test.afterAll(clearMonth);

test("traffic reads the month, updates a gate and the summary follows", async ({ page }) => {
  await signIn(page, "traffic@test.local");
  await page.goto(`/en/gates?month=${MONTH}`);

  const timeline = page.getByTestId("gates-timeline");
  await expect(timeline).toBeVisible({ timeout: 20_000 });
  await expect(timeline.getByRole("heading", { name: "Content and social" })).toBeVisible();
  await expect(timeline.getByRole("heading", { name: "MQL review" })).toBeVisible();
  await expect(timeline.locator('[data-kind="checkpoint"]')).toHaveCount(3);
  await expect(page.getByTestId("gates-summary")).toContainText("0 of");

  await timeline.getByRole("button", { name: /^Gate 25: everything approved and scheduled/ }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Gate 25: everything approved and scheduled" })).toBeVisible();

  await sheet.getByLabel("Status").click();
  await page.getByRole("option", { name: "Done" }).click();
  await sheet.getByLabel("Note").fill("Approved by the team");
  await sheet.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByTestId("gates-summary")).toContainText("1 of");
});

test("a deleted item stays deleted after a reload", async ({ page }) => {
  await signIn(page, "traffic@test.local");
  await page.goto(`/en/gates?month=${MONTH}`);
  const timeline = page.getByTestId("gates-timeline");
  await expect(timeline.locator('[data-kind="checkpoint"]')).toHaveCount(3, { timeout: 20_000 });

  await timeline.getByRole("button", { name: /^MQL review, day 10/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete from this month" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(timeline.locator('[data-kind="checkpoint"]')).toHaveCount(2);

  await page.reload();
  await expect(page.getByTestId("gates-timeline").locator('[data-kind="checkpoint"]')).toHaveCount(2, { timeout: 20_000 });
});

test("a member sees the month without the manager's controls", async ({ page }) => {
  await signIn(page, "member@test.local");
  await page.goto(`/en/gates?month=${MONTH}`);
  await expect(page.getByTestId("gates-timeline")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Edit rhythm" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add item" })).toHaveCount(0);

  await page.goto("/en/gates/rhythm");
  await expect(page).toHaveURL(/\/en\/gates$/);
});

test("the rhythm page explains what a change affects", async ({ page }) => {
  await signIn(page, "traffic@test.local");
  await page.goto("/en/gates/rhythm");
  await expect(page.getByText("except items someone has already started or edited")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("gate-template").first()).toBeVisible();
});

test("at 375px the month is an agenda with no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn(page, "traffic@test.local");
  await page.goto(`/en/gates?month=${MONTH}`);

  await expect(page.getByTestId("gates-agenda")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("gates-timeline")).toBeHidden();
  await expectNoSideScroll(page);

  await page.getByTestId("gate-agenda-item").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoSideScroll(page);
});

test("Arabic mirrors the timeline", async ({ page }) => {
  await signIn(page, "traffic@test.local");
  await page.goto(`/ar/gates?month=${MONTH}`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  const timeline = page.getByTestId("gates-timeline");
  await expect(timeline.getByRole("heading", { name: "المحتوى والسوشيال" })).toBeVisible({ timeout: 20_000 });

  // Day 5 sits nearer the right-hand edge than day 25.
  const early = await timeline.getByRole("button", { name: /^بوابة 5/ }).boundingBox();
  const late = await timeline.getByRole("button", { name: /^بوابة 25/ }).boundingBox();
  expect(early!.x).toBeGreaterThan(late!.x);
  await expectNoSideScroll(page);
});
