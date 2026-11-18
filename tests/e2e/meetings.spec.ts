import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// W-11: book a meeting, answer it, keep notes and actions, and the access around it.
const MEMBER = "00000000-0000-4000-8000-000000000006";
const MEMBER2 = "00000000-0000-4000-8000-000000000007";
const SALES = "00000000-0000-4000-8000-000000000009";
const title = `E2E meeting ${Date.now()}`;
// A date far enough out that no other run or seeded meeting holds the room.
const date = `2032-0${1 + Math.floor(Math.random() * 9)}-1${Math.floor(Math.random() * 9)}`;
let meetingUrl = "";

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function noOverflow(page: Page) {
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${page.url()} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
}

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const svc = admin();
  const { data } = await svc.from("meetings").select("id, meeting_actions(card_id)").like("title", `${title}%`);
  for (const m of data ?? []) {
    const cards = (m.meeting_actions as { card_id: string | null }[]).map((a) => a.card_id).filter((c): c is string => !!c);
    if (cards.length) await svc.from("cards").delete().in("id", cards);
    await svc.from("notifications").delete().eq("data->>meeting_id", m.id);
    await svc.from("meetings").delete().eq("id", m.id);
  }
});

test("a colleague books a meeting from the map's link, with a room and a guest", async ({ page }) => {
  await signIn(page, "member@test.local");
  await page.goto(`/en/meetings?new=1&with=${MEMBER2}`);

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "New meeting" })).toBeVisible();
  await expect(sheet.getByRole("list", { name: "Selected people" }).getByRole("listitem")).toHaveCount(1);

  // A title is required, and the error sits beside the field.
  await sheet.getByRole("button", { name: "Book meeting" }).click();
  await expect(sheet.getByText("This field is required")).toBeVisible();

  await sheet.getByLabel("Title").fill(title);
  await sheet.getByLabel("Date").fill(date);
  await sheet.getByLabel("Start time").fill("11:00");
  await sheet.getByRole("combobox", { name: "Room" }).click();
  await page.getByRole("option", { name: /Studio.*Free/ }).click();

  await sheet.getByRole("button", { name: "Add a guest" }).click();
  await sheet.getByLabel("Name").fill("Outside Guest");
  await sheet.getByLabel("Email").fill("outside.guest@example.com");
  await sheet.getByLabel("Agenda").fill("Budget; timing, next steps");
  await sheet.getByRole("button", { name: "Book meeting" }).click();

  await expect(page).toHaveURL(/\/en\/meetings\/[0-9a-f-]{36}$/);
  meetingUrl = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  await expect(page.getByText("Budget; timing, next steps")).toBeVisible();
  await expect(page.getByText("outside.guest@example.com")).toBeVisible();
  // No email service locally, so the invitation must not be marked as sent.
  await expect(page.getByText("Not sent yet")).toBeVisible();
});

test("the room shows as taken for anyone else at that time", async ({ page }) => {
  await signIn(page, "member2@test.local");
  await page.goto("/en/meetings?new=1");
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Date").fill(date);
  await sheet.getByLabel("Start time").fill("11:00");
  await sheet.getByRole("combobox", { name: "Room" }).click();
  const taken = page.getByRole("option", { name: /Studio.*Taken/ });
  await expect(taken).toBeVisible();
  await expect(taken).toHaveAttribute("aria-disabled", "true");
});

test("an attendee answers, and notes and actions are kept", async ({ page }) => {
  await signIn(page, "member2@test.local");
  await page.goto(meetingUrl);

  await page.getByRole("button", { name: "Maybe" }).click();
  await expect(page.getByRole("button", { name: "Maybe" })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Meeting notes").fill("We agreed the budget.");
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Meeting notes")).toHaveValue("We agreed the budget.");
  await expect(page.getByRole("listitem").filter({ hasText: "Maybe" }).first()).toBeVisible();

  await page.getByLabel("Action", { exact: true }).fill("Send the brief");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Send the brief")).toBeVisible();

  await page.getByRole("button", { name: "Make it a card" }).click();
  await expect(page.getByRole("link", { name: "Open card" })).toBeVisible();
});

test("the calendar file is only for people who can see the meeting", async ({ page, browser }) => {
  const id = meetingUrl.split("/").pop();
  const signedOut = await browser.newContext();
  expect((await signedOut.request.get(`http://localhost:${process.env.E2E_PORT ?? 3000}/api/meetings/${id}/ics`)).status()).toBe(401);
  await signedOut.close();

  await signIn(page, "member2@test.local");
  const file = await page.request.get(`/api/meetings/${id}/ics`);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toContain("text/calendar");
  const body = await file.text();
  expect(body).toContain("METHOD:REQUEST");
  expect(body).toContain(`UID:${id}@`.slice(0, 60));
  expect(body).toContain("\r\n");

  await page.context().clearCookies();
  await signIn(page, "sales@test.local");
  expect((await page.request.get(`/api/meetings/${id}/ics`)).status()).toBe(404);
});

test("a portal user sees only their own meetings and cannot change fixed ones", async ({ page }) => {
  await signIn(page, "sales@test.local");
  await page.goto("/en/portal/meetings");
  await expect(page.getByRole("heading", { name: "Meetings", level: 1 })).toBeVisible();
  await expect(page.getByText(title)).toHaveCount(0);

  await page.goto(`/en/portal${meetingUrl.replace("/en", "")}`);
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);

  await page.goto("/en/portal/meetings?tab=fixed");
  await expect(page.getByRole("button", { name: "New fixed meeting" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Rooms" })).toHaveCount(0);
});

test("a portal user invited to a meeting sees it with everyone's answers and can reply", async ({ page }) => {
  const svc = admin();
  const invited = `${title} invited`;
  const { data, error } = await svc
    .from("meetings")
    .insert({ title: invited, starts_at: `${date}T08:00:00Z`, ends_at: `${date}T08:30:00Z`, organizer_id: MEMBER })
    .select("id")
    .single();
  expect(error).toBeNull();
  const people = await svc.from("meeting_attendees").insert([
    { meeting_id: data!.id, user_id: MEMBER, response: "accepted" },
    { meeting_id: data!.id, user_id: SALES, response: "pending" },
  ]);
  expect(people.error).toBeNull();

  await signIn(page, "sales@test.local");
  await page.goto("/en/portal/meetings");
  await page.getByRole("link", { name: new RegExp(invited) }).click();
  await expect(page).toHaveURL(new RegExp(`/en/portal/meetings/${data!.id}$`));
  await expect(page.getByRole("heading", { name: invited, level: 1 })).toBeVisible();
  // Both people are listed, not only the viewer.
  await expect(page.getByText("Going")).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  // The attendee list only changes once the answer has been saved.
  await expect(page.getByText("Going")).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole("button", { name: "Accept" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Make it a card" })).toHaveCount(0);
});

test("a portal user who owns a fixed meeting's date still cannot edit or cancel it", async ({ page }) => {
  const svc = admin();
  const { data: series } = await svc.from("meeting_series").select("id").limit(1).single();
  const { data, error } = await svc
    .from("meetings")
    .insert({ title: `${title} fixed`, series_id: series!.id, occurrence_on: date, starts_at: `${date}T09:00:00Z`, ends_at: `${date}T09:30:00Z`, organizer_id: SALES })
    .select("id")
    .single();
  expect(error).toBeNull();
  await svc.from("meeting_attendees").insert({ meeting_id: data!.id, user_id: SALES, response: "accepted" });

  await signIn(page, "sales@test.local");
  await page.goto(`/en/portal/meetings/${data!.id}`);
  await expect(page.getByRole("heading", { name: `${title} fixed`, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel meeting" })).toHaveCount(0);
});

test("only managers can manage fixed meetings and rooms", async ({ page }) => {
  await signIn(page, "member@test.local");
  await page.goto("/en/meetings?tab=fixed");
  await expect(page.getByRole("heading", { name: "Daily", level: 2 })).toBeVisible();
  await expect(page.getByText("Daily stand-up")).toBeVisible();
  await expect(page.getByRole("button", { name: "New fixed meeting" })).toHaveCount(0);

  await page.context().clearCookies();
  await signIn(page, "traffic@test.local");
  await page.goto("/en/meetings?tab=fixed");
  await page.getByRole("button", { name: "Rooms" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Meeting rooms" })).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Studio")).toBeVisible();
});

for (const locale of ["en", "ar"]) {
  test(`${locale}: the screens fit a 375px phone`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await signIn(page, "member@test.local");
    for (const path of ["/meetings", "/meetings?tab=fixed", "/meetings?tab=past", meetingUrl.replace("/en", "")]) {
      await page.goto(`/${locale}${path}`);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByText(/Something went wrong|حدث خطأ/)).toHaveCount(0);
      await noOverflow(page);
    }
  });
}

test("the Arabic page is translated", async ({ page }) => {
  await signIn(page, "member@test.local");
  await page.goto("/ar/meetings?tab=fixed");
  await expect(page.getByRole("heading", { name: "الاجتماعات", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "الاجتماعات الثابتة" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("الاجتماع اليومي السريع")).toBeVisible();
});
