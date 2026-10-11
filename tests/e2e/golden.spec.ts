import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// D7-04 golden paths. Each user gets their own browser context.
test.describe.configure({ mode: "serial" });

async function as(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ locale: "en-US", timezoneId: "Africa/Cairo" });
  const page = await context.newPage();
  await signIn(page, email);
  return page;
}

async function pick(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).first().click();
}

async function openCard(page: Page, id: string) {
  await page.goto(`/en/cards/${id}`);
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
}

test("content cycle: urgent request to published post", async ({ browser }) => {
  test.setTimeout(300_000);
  const title = `E2E urgent ${Date.now()}`;

  // 1. Sales submits an urgent request.
  const sales = await as(browser, "sales@test.local");
  await sales.goto("/en/portal/requests/new");
  await sales.getByRole("tab", { name: "Urgent request" }).click();
  await sales.getByLabel("Title").fill(title);
  await sales.getByLabel("Objective").fill("Fill meeting rooms next week");
  await pick(sales, "Vertical", "Daily Reservation");
  await pick(sales, "Brand", "Espaces");
  await pick(sales, "Format", "static");
  await sales.getByLabel("Due date").fill("2027-02-01T12:00");
  await sales.getByRole("button", { name: "Instagram" }).click();
  await sales.getByLabel("Why is it urgent?").fill("Event moved to tomorrow");
  await sales.getByRole("button", { name: "Submit urgent request" }).click();
  await sales.waitForURL(/\/portal\/requests\/[0-9a-f-]{36}/);
  const cardId = sales.url().split("/").pop()!;

  // 2. Performance lead: no input.
  const perf = await as(browser, "lead.performance@test.local");
  await openCard(perf, cardId);
  await perf.getByRole("button", { name: "Add visual suggestions" }).click();
  await perf.getByRole("button", { name: "No input" }).click();
  await expect(perf.getByText("Moved to Intake").first()).toBeVisible();

  // 3. Traffic accepts and briefs.
  const traffic = await as(browser, "traffic@test.local");
  await openCard(traffic, cardId);
  await traffic.getByRole("button", { name: "Accept" }).click();
  await expect(traffic.getByRole("button", { name: "Start production" })).toBeVisible();
  await traffic.getByRole("button", { name: "Start production" }).click();
  await pick(traffic, "Assignee", "Mona");
  await traffic.getByLabel("Production due date").fill("2027-01-20T12:00");
  await traffic.getByRole("dialog").last().getByRole("button", { name: "Start production" }).click();
  await expect(traffic.getByText("Moved to Production").first()).toBeVisible();

  // 4. The assignee submits for review.
  const member = await as(browser, "member@test.local");
  await openCard(member, cardId);
  await member.getByRole("button", { name: "Submit for review" }).click();
  await expect(member.getByText("Moved to Creative review").first()).toBeVisible();

  // 5. Creative lead approves, 6. the department's approver confirms.
  const lead = await as(browser, "lead.creative@test.local");
  await lead.goto("/en/approvals");
  await lead.getByTestId("inbox-item").filter({ hasText: title }).getByRole("button", { name: "Approve" }).click();
  await expect(lead.getByText("Decision saved").first()).toBeVisible();
  const approver = await as(browser, "approver@test.local");
  await approver.goto("/en/portal/approvals");
  await approver.getByTestId("inbox-item").filter({ hasText: title }).getByRole("button", { name: "Approve" }).click();
  await expect(approver.getByText("Decision saved").first()).toBeVisible();

  // 7. Community schedules the post from the card and marks it published.
  const community = await as(browser, "community@test.local");
  await openCard(community, cardId);
  await community.getByRole("button", { name: "Schedule on the content calendar" }).click();
  await community.waitForURL(/\/content\?.*post=/);
  await community.getByRole("button", { name: "Mark as published" }).click();
  await expect(community.getByText("Marked as published").first()).toBeVisible();

  // The card is now published.
  await openCard(traffic, cardId);
  await expect(traffic.getByRole("dialog").getByText("Published").first()).toBeVisible();
});

test("QR check-in appears on a teammate's map", async ({ browser }) => {
  test.setTimeout(120_000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const branch = "30000000-0000-4000-8000-000000000001";
  const member = "00000000-0000-4000-8000-000000000006";
  const key = "e2e-kiosk-key-123456";
  await svc.from("branch_secrets").update({ kiosk_key_hash: createHash("sha256").update(key).digest("hex") }).eq("branch_id", branch);
  // Start clean: member checked out.
  const { data: open } = await svc.from("attendance_sessions").select("id, checked_in_at").eq("user_id", member).is("checked_out_at", null);
  for (const s of open ?? []) await svc.from("attendance_sessions").update({ checked_out_at: new Date(Date.parse(s.checked_in_at) + 1000).toISOString() }).eq("id", s.id);

  const viewer = await as(browser, "member2@test.local");
  await viewer.goto("/en/map");
  const counter = viewer.getByText(/people here|person here|Nobody here/);
  await expect(counter).toBeVisible();
  const before = Number((await counter.textContent())?.match(/\d+/)?.[0] ?? 0);

  const page = await as(browser, "member@test.local");
  const res = await page.request.get(`/api/kiosk/${branch}/token?key=${key}`);
  const { url: checkinUrl } = (await res.json()) as { url: string };
  await page.goto(new URL(checkinUrl).pathname + new URL(checkinUrl).search);
  await page.getByRole("button", { name: /Check in at/ }).click();
  await expect(page.getByText(/Checked in at/)).toBeVisible();

  await expect(viewer.getByText(new RegExp(`${before + 1} (people|person) here`))).toBeVisible({ timeout: 10_000 });
});

test("annual leave goes through team lead, admin and hr", async ({ browser }) => {
  test.setTimeout(180_000);
  // A random working day (Fridays are off and would be refused).
  let date = "";
  do {
    const day = 1 + Math.floor(Math.random() * 28);
    date = `2027-11-${String(day).padStart(2, "0")}`;
  } while (new Date(`${date}T12:00:00Z`).getUTCDay() === 5);
  const member = await as(browser, "member@test.local");
  await member.goto("/en/requests/new");
  await member.getByRole("button", { name: "Annual leave" }).click();
  await member.getByLabel("First day").fill(date);
  await member.getByLabel("Last day").fill(date);
  await member.getByRole("button", { name: "Submit request" }).click();
  await member.waitForURL(/\/requests$/);

  for (const email of ["lead.creative@test.local", "admin@test.local", "hr@test.local"]) {
    const approver = await as(browser, email);
    await approver.goto("/en/approvals");
    const item = approver.getByTestId("inbox-item").filter({ hasText: "Annual leave" }).filter({ hasText: "Mona" }).filter({ hasText: date }).first();
    await item.getByRole("button", { name: "Approve" }).click();
    await expect(approver.getByText("Decision saved").first()).toBeVisible();
  }

  await member.reload();
  await expect(member.locator("li").filter({ hasText: date }).getByText("Approved")).toBeVisible();
});
