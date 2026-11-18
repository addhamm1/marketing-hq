import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// W-17: the wardrobe, seasonal outfits and saved looks.
const EVENT_KEY = "e2e-w17-season";
const MEMBER = "00000000-0000-4000-8000-000000000007";

const svc = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());

async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

let saved: { config: unknown; looks: unknown } | null = null;

test.beforeAll(async () => {
  const db = svc();
  const { data } = await db.from("avatars").select("config, looks").eq("user_id", MEMBER).maybeSingle();
  saved = data;
  await db.from("seasonal_events").delete().eq("key", EVENT_KEY);
  const { error } = await db.from("seasonal_events").insert({
    key: EVENT_KEY, name_en: "Test season", name_ar: "موسم تجريبي", starts_on: today(), ends_on: today(), items: ["spring-hat"],
  });
  if (error) throw error;
});

test.afterAll(async () => {
  const db = svc();
  await db.from("seasonal_events").delete().eq("key", EVENT_KEY);
  if (saved) await db.from("avatars").update(saved).eq("user_id", MEMBER);
  else await db.from("avatars").delete().eq("user_id", MEMBER);
});

test("picks clothes, wears a seasonal item, saves a look and undoes a change", async ({ page }) => {
  await signIn(page, "member2@test.local");
  await page.goto("/en/me/character");
  await expect(page.getByTestId("character-stage")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("tab", { name: "Top" }).click();
  const polo = page.getByRole("button", { name: "Polo", exact: true });
  await polo.click();
  await expect(polo).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(polo).toHaveAttribute("aria-pressed", "false");
  await polo.click();
  await page.screenshot({ path: "test-results/character-desktop.png" });

  await page.getByRole("tab", { name: "Seasonal" }).click();
  await expect(page.getByText("Last day")).toBeVisible();
  const hat = page.getByRole("button", { name: "Straw hat" });
  await hat.click();
  await expect(hat).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Save character" }).click();
  await expect(page.getByText("Character saved")).toBeVisible();

  await page.getByRole("tab", { name: "My looks" }).click();
  const slot = page.getByTestId("look-slot").first();
  await slot.getByRole("button", { name: /Save current look|Overwrite/ }).click();
  await slot.getByLabel("Look name").fill("Eid best");
  await slot.getByRole("button", { name: "Save look" }).click();
  await expect(slot.getByText("Eid best")).toBeVisible();
});

test("a blank look name shows an error beside the field", async ({ page }) => {
  await signIn(page, "member2@test.local");
  await page.goto("/en/me/character");
  await page.getByRole("tab", { name: "My looks" }).click({ timeout: 20_000 });
  const slot = page.getByTestId("look-slot").nth(2);
  await slot.getByRole("button", { name: /Save current look|Overwrite/ }).click();
  await slot.getByLabel("Look name").fill("   ");
  await slot.getByRole("button", { name: "Save look" }).click();
  await expect(slot.getByText("This field is required")).toBeVisible();
});

test("works at 375px and in Arabic", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn(page, "member2@test.local", undefined, "ar");
  await page.goto("/ar/me/character");
  await expect(page.getByTestId("character-stage")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await noSideScroll(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/character-ar-375-body.png" });
  await page.getByRole("tab", { name: "المواسم" }).click();
  await expect(page.getByText("آخر يوم")).toBeVisible();
  await noSideScroll(page);
  await page.screenshot({ path: "test-results/character-ar-375.png" });
});
