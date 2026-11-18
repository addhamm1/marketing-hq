import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const MEMBER = "00000000-0000-4000-8000-000000000006";

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("My Day", () => {
  let meetingId = "";
  const title = `E2E briefing ${Date.now()}`;

  test.beforeAll(async () => {
    const start = Date.now() + 2 * 60_000;
    const { data, error } = await admin()
      .from("meetings")
      .insert({ title, title_ar: title, starts_at: new Date(start).toISOString(), ends_at: new Date(start + 30 * 60_000).toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    meetingId = data.id;
    await admin().from("meeting_attendees").insert({ meeting_id: meetingId, user_id: MEMBER });
  });

  test.afterAll(async () => {
    await admin().from("meetings").delete().eq("id", meetingId);
    await admin().from("notification_preferences").delete().eq("user_id", MEMBER);
  });

  test("is the home screen and lets me answer an invitation", async ({ page }) => {
    await signIn(page, "member@test.local");
    await expect(page).toHaveURL(/\/en\/my-day/);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);
    await expect(page.getByTestId("checkin-strip")).toBeVisible();

    const row = page.getByTestId("meeting-row").filter({ hasText: title });
    await expect(row.getByText("Waiting for your reply")).toBeVisible();
    await row.getByRole("button", { name: `Accept ${title}` }).click();
    await expect(row.getByRole("button", { name: `Accept ${title}` })).toHaveCount(0);
    await expect(row.getByText("Waiting for your reply")).toHaveCount(0);

    const { data } = await admin().from("meeting_attendees").select("response").eq("meeting_id", meetingId).eq("user_id", MEMBER).single();
    expect(data?.response).toBe("accepted");
  });

  test("fits a 375px phone in English and Arabic", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signIn(page, "member@test.local");
    await page.goto("/en/my-day");
    await expect(page.getByTestId("section-meetings")).toBeVisible();
    await noOverflow(page);

    await page.goto("/ar/my-day");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "اجتماعات النهارده" })).toBeVisible();
    await noOverflow(page);
  });

  test("account settings save the morning email choice", async ({ page }) => {
    await signIn(page, "member@test.local");
    await page.goto("/en/me/account");
    await page.waitForLoadState("networkidle");
    const digest = page.getByTestId("digest-switch");
    await expect(digest).toBeChecked();
    await digest.click();
    await expect(digest).not.toBeChecked();
    await expect(digest).toBeEnabled();
    await page.reload();
    await expect(page.getByTestId("digest-switch")).not.toBeChecked();
    await noOverflow(page);
  });

  test("account settings explain why this browser cannot enable phone notifications", async ({ page }) => {
    await signIn(page, "member@test.local");
    await page.goto("/ar/me/account");
    // Local development has no VAPID key configured.
    await expect(page.getByTestId("push-hint-unconfigured")).toBeVisible();
    await expect(page.getByTestId("push-switch")).toBeDisabled();
  });

  test("portal users have the same settings", async ({ page }) => {
    await signIn(page, "sales@test.local");
    await page.goto("/en/me/account");
    await expect(page.getByTestId("digest-switch")).toBeVisible();
    await expect(page.getByTestId("push-switch")).toBeVisible();
  });

  test("portal users opening My Day land on the portal", async ({ page }) => {
    await signIn(page, "sales@test.local");
    await page.goto("/en/my-day");
    await expect(page).toHaveURL(/\/en\/portal/);
  });

  test("the service worker and manifest are served for registration", async ({ request }) => {
    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBe(true);
    expect(sw.headers()["content-type"]).toContain("javascript");
    expect(sw.headers()["cache-control"]).toContain("no-cache");
    expect(sw.headers()["service-worker-allowed"]).toBe("/");

    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBe(true);
    expect(await manifest.json()).toMatchObject({ display: "standalone", scope: "/" });
  });

  test("cron routes refuse callers without the secret", async ({ request }) => {
    expect((await request.get("/api/cron/digest")).status()).toBe(401);
    expect((await request.get("/api/cron/push")).status()).toBe(401);
  });
});
