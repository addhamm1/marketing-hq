import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// W-15: the shoot day planner, field check-in on a shoot, and the admin launch tools.
const COMMUNITY = "00000000-0000-4000-8000-000000000008";
const HQ = "30000000-0000-4000-8000-000000000001";
const svc = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const cairoToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());

async function noSideScroll(page: Page) {
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

test("a marketing member plans a shoot from start to call sheet", async ({ page }) => {
  const title = `E2E branch tour ${Date.now()}`;
  await signIn(page, "member@test.local");
  await page.goto("/en/shoots");
  await page.getByRole("link", { name: "New shoot" }).click();

  await page.getByLabel("Shoot title").fill(title);
  await page.getByRole("radio", { name: "Outside location" }).click();
  await page.getByLabel("Location name").fill("Al-Azhar Park");
  await page.getByLabel("Map link").fill("not a link");
  await page.getByRole("button", { name: "Create shoot" }).click();
  await expect(page.getByText("Enter a link that starts with https://")).toBeVisible();
  await page.getByLabel("Map link").fill("https://maps.example.com/park");
  await page.getByRole("button", { name: "Create shoot" }).click();

  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible({ timeout: 15_000 });
  const shootId = page.url().split("/").pop()!;

  // Crew: an outside name.
  await page.getByRole("combobox", { name: "Who" }).click();
  await page.getByRole("option", { name: "Outside" }).click();
  await page.getByLabel("Their name").fill("Sara the photographer");
  await page.getByLabel("Role", { exact: true }).fill("Camera");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Sara the photographer")).toBeVisible();

  // Shots: add two, then move the second above the first.
  await page.getByRole("tab", { name: /Shots/ }).click();
  for (const shot of ["Wide of the entrance", "Close-up of the sign"]) {
    await page.getByRole("button", { name: "Add shot" }).first().click();
    await page.getByLabel("What to capture").fill(shot);
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(shot)).toBeVisible();
  }
  await page.getByRole("button", { name: "Move up: Close-up of the sign" }).click();
  await expect(page.locator("ol > li").first()).toContainText("Close-up of the sign");
  await page.reload();
  await page.getByRole("tab", { name: /Shots/ }).click();
  await expect(page.locator("ol > li").first()).toContainText("Close-up of the sign");

  // Equipment: one tap adds the kit, a second tap adds nothing.
  await page.getByRole("tab", { name: /Kit/ }).click();
  await page.getByRole("button", { name: "Add default kit" }).click();
  await expect(page.getByText("Memory cards")).toBeVisible();
  await page.getByRole("button", { name: "Add default kit" }).click();
  await expect(page.getByRole("tab", { name: "Kit (8)" })).toBeVisible();

  // Call sheet: prints the sheet alone.
  await page.goto(`/en/shoots/${shootId}/call-sheet`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Sara the photographer")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Print" })).toBeHidden();
  await expect(page.getByRole("complementary")).toBeHidden();
  await page.emulateMedia({ media: "screen" });

  await svc().from("shoots").delete().eq("id", shootId);
});

test("field check-in offers today's shoot and records it", async ({ page, context }) => {
  const db = svc();
  await db.from("attendance_sessions").delete().eq("user_id", COMMUNITY).is("checked_out_at", null);
  await db.from("shoots").delete().like("title", "E2E field shoot%"); // left by an interrupted run
  const { data: shoot, error } = await db
    .from("shoots")
    .insert({ title: `E2E field shoot ${Date.now()}`, shoot_on: cairoToday(), branch_id: HQ, status: "confirmed" })
    .select("id, title")
    .single();
  if (error) throw error;
  await db.from("shoot_crew").insert({ shoot_id: shoot.id, user_id: COMMUNITY, role: "Camera" });

  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 30.05, longitude: 31.25, accuracy: 20 });
  await signIn(page, "community@test.local");
  await page.goto("/en/checkin");
  await page.getByRole("button", { name: "Field / shooting day" }).click();
  await expect(page.getByRole("combobox", { name: "Today's shoot" })).toContainText(shoot.title);
  await page.getByRole("button", { name: "Start field day" }).click();

  await expect.poll(async () => {
    const { data } = await db.from("attendance_sessions").select("shoot_id").eq("user_id", COMMUNITY).is("checked_out_at", null).maybeSingle();
    return data?.shoot_id;
  }, { timeout: 15_000 }).toBe(shoot.id);

  await db.from("attendance_sessions").delete().eq("user_id", COMMUNITY).eq("shoot_id", shoot.id);
  await db.from("profiles").update({ presence: "available" }).eq("id", COMMUNITY);
  await db.from("shoots").delete().eq("id", shoot.id);
});

test("people set their own birthday, with no year", async ({ page }) => {
  await signIn(page, "member2@test.local");
  await page.goto("/en/me/account");
  await page.getByRole("combobox", { name: "Month" }).click();
  await page.getByRole("option", { name: "February" }).click();
  await page.getByRole("combobox", { name: "Day" }).click();
  await expect(page.getByRole("option", { name: "29", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "30", exact: true })).toHaveCount(0);
  await page.getByRole("option", { name: "14", exact: true }).click();
  await page.getByRole("button", { name: "Save" }).nth(1).click();
  await expect(page.getByText("Birthday settings saved")).toBeVisible();
  await expect(page.getByRole("combobox", { name: /year/i })).toHaveCount(0);
});

test("the super admin sees launch readiness and confirms bulk allowances", async ({ page }) => {
  await signIn(page, "admin@test.local");
  await page.goto("/en/admin/launch");
  await expect(page.getByRole("heading", { name: "Launch readiness" })).toBeVisible();
  for (const id of ["branches", "birthday", "joined", "phone", "branch", "leave", "hr", "rooms", "holidays", "gates", "email", "push"]) {
    await expect(page.getByTestId(`check-${id}`)).toBeVisible();
  }
  // Secret values never reach the page.
  expect(await page.content()).not.toContain(process.env.SUPABASE_SERVICE_ROLE_KEY!);

  await page.goto("/en/admin/users?missing=birthday");
  await expect(page.getByText(/without a birthday/)).toBeVisible();

  await page.goto("/en/admin/leave");
  await page.getByRole("button", { name: "Set for everyone" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Days per person")).toHaveValue("21");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/en/admin/seasons");
  await expect(page.getByRole("button", { name: /Ramadan/ })).toBeVisible();
});

test("a member cannot open the admin launch tools", async ({ page }) => {
  await signIn(page, "member@test.local");
  await page.goto("/en/admin/launch");
  await expect(page).not.toHaveURL(/\/admin/);
});

test.describe("phone width and Arabic", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("new screens fit at 375px in both languages", async ({ page }) => {
    await svc().from("shoots").delete().like("title", "E2E narrow screen%"); // left by an interrupted run
    const { data: shoot } = await svc().from("shoots").insert({ title: "E2E narrow screen shoot with a fairly long title", shoot_on: cairoToday(), branch_id: HQ }).select("id").single();
    await signIn(page, "admin@test.local");
    for (const locale of ["en", "ar"]) {
      for (const path of ["/shoots", "/shoots/new", `/shoots/${shoot!.id}`, `/shoots/${shoot!.id}/call-sheet`, "/admin/launch", "/admin/seasons", "/admin/rooms", "/admin/organisation", "/me/account"]) {
        await page.goto(`/${locale}${path}`);
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        await expect(page.getByText(/Something went wrong|حدث خطأ/)).toHaveCount(0);
        await noSideScroll(page);
      }
    }
    await page.goto("/ar/shoots");
    await expect(page.getByRole("heading", { name: "أيام التصوير", level: 1 })).toBeVisible();
    await svc().from("shoots").delete().eq("id", shoot!.id);
  });
});
