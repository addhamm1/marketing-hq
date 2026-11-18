import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { type NavGrid, type Rect, type Tile, isSeat, isWalkable, parseNavGrid } from "../../src/game/life/grid";
import { findPath } from "../../src/game/life/path";
import { signIn } from "./helpers";

// W-16: walking and greeting people on the map; kudos, birthdays and anniversaries.
const HQ_BRANCH = "30000000-0000-4000-8000-000000000001";
const WALKER = { id: "00000000-0000-4000-8000-000000000005", email: "lead.performance@test.local" };
const COLLEAGUE = { id: "00000000-0000-4000-8000-000000000008", email: "community@test.local" };
const WATCHER = { id: "00000000-0000-4000-8000-000000000003", email: "traffic@test.local" };

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const map = JSON.parse(readFileSync(path.resolve("public/maps/hq.json"), "utf8")) as {
  layers: { name: string; objects?: (Rect & { x: number; y: number })[] }[];
};
const grid = parseNavGrid(map) as NavGrid;
const zones = map.layers.find((l) => l.name === "zones")?.objects ?? [];
const signs = map.layers.find((l) => l.name === "signs")?.objects ?? [];

/** Open floor, away from every zone and sign, that can be walked to from the first such tile. */
const openFloor: Tile[] = (() => {
  const tiles: Tile[] = [];
  for (let y = 1; y < grid.height - 1; y++) {
    for (let x = 1; x < grid.width - 1; x++) {
      const [cx, cy] = [(x + 0.5) * grid.tileSize, (y + 0.5) * grid.tileSize];
      const inZone = zones.some((z) => cx >= z.x - 16 && cx <= z.x + z.width + 16 && cy >= z.y - 16 && cy <= z.y + z.height + 16);
      const nearSign = signs.some((s) => Math.abs(s.x - cx) < 64 && Math.abs(s.y - cy) < 32);
      if (isWalkable(grid, x, y) && !isSeat(grid, x, y) && !inZone && !nearSign) tiles.push({ x, y });
    }
  }
  return tiles.filter((t) => findPath(grid, tiles[0], t));
})();
const [T1, T2, T3] = [openFloor[0], openFloor[Math.floor(openFloor.length / 2)], openFloor[openFloor.length - 1]];

async function checkOut(userId: string) {
  const { data } = await svc.from("attendance_sessions").select("id, checked_in_at").eq("user_id", userId).is("checked_out_at", null);
  for (const s of data ?? []) {
    const out = new Date(Math.max(Date.now(), Date.parse(s.checked_in_at) + 1000)).toISOString();
    await svc.from("attendance_sessions").update({ checked_out_at: out }).eq("id", s.id);
  }
}

async function checkInAt(userId: string, tile: Tile) {
  await checkOut(userId);
  const { error } = await svc.rpc("check_in", {
    p_user_id: userId, p_method: "wifi", p_branch_id: HQ_BRANCH, p_lat: 30.096, p_lng: 31.326, p_accuracy_m: 10, p_verify: { test: true },
  });
  if (error) throw error;
  const saved = await svc.from("map_positions").upsert({ user_id: userId, branch_id: HQ_BRANCH, tile_x: tile.x, tile_y: tile.y });
  if (saved.error) throw saved.error;
}

/** Where a world tile appears on the page: the map is fitted to the canvas and centred. */
async function tilePoint(page: Page, tile: Tile) {
  const box = (await page.getByTestId("pixel-map").boundingBox())!;
  const [mapW, mapH] = [grid.width * grid.tileSize, grid.height * grid.tileSize];
  const zoom = Math.min(box.width / mapW, box.height / mapH);
  return {
    x: box.x + box.width / 2 + ((tile.x + 0.5) * grid.tileSize - mapW / 2) * zoom,
    y: box.y + box.height / 2 + ((tile.y + 0.5) * grid.tileSize - mapH / 2) * zoom,
  };
}

async function tap(page: Page, tile: Tile) {
  const at = await tilePoint(page, tile);
  await page.mouse.click(at.x, at.y);
}

async function openMap(page: Page) {
  await page.goto("/en/map");
  await expect(page.getByTestId("pixel-map").locator("canvas")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3_000); // the map, zones and avatars load inside the canvas
}

const savedTile = async (userId: string) => {
  const { data } = await svc.from("map_positions").select("tile_x, tile_y").eq("user_id", userId).maybeSingle();
  return data ? { x: data.tile_x, y: data.tile_y } : null;
};

const interactions = async (kind: string) => {
  const { data } = await svc.from("map_interactions").select("to_id").eq("from_id", WALKER.id).eq("kind", kind);
  return data ?? [];
};

test.describe("the map", () => {
  test.beforeEach(async () => {
    await svc.from("map_interactions").delete().eq("from_id", WALKER.id);
    await checkInAt(WALKER.id, T1);
    await checkInAt(COLLEAGUE.id, T2);
    await checkOut(WATCHER.id);
  });

  test.afterEach(async () => {
    await checkOut(WALKER.id);
    await checkOut(COLLEAGUE.id);
    await svc.from("map_interactions").delete().eq("from_id", WALKER.id);
    await svc.from("notifications").delete().eq("user_id", COLLEAGUE.id).eq("kind", "map_invite");
  });

  test("walk by tapping the floor; a drag does not move you", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, WALKER.email);
    await openMap(page);

    await tap(page, T3);
    await expect.poll(() => savedTile(WALKER.id), { timeout: 15_000 }).toEqual(T3);

    // Pan across the map: the character must not be sent anywhere.
    const from = await tilePoint(page, T1);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 60, from.y + 30, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(1_500);
    expect(await savedTile(WALKER.id)).toEqual(T3);
  });

  test("greet a colleague and dance on your own", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, WALKER.email);
    await openMap(page);

    await tap(page, T2);
    const card = page.getByRole("dialog");
    await expect(card.getByRole("group", { name: "Say hello" })).toBeVisible({ timeout: 10_000 });
    for (const name of ["Wave", "High five", "Coffee", "Chat"]) await expect(card.getByRole("button", { name })).toBeVisible();
    await expect(card.getByRole("link", { name: "Request meeting" })).toHaveAttribute("href", `/en/meetings?new=1&with=${COLLEAGUE.id}`);

    await card.getByRole("button", { name: "Wave" }).click();
    await expect(card).toBeHidden();
    await expect.poll(() => interactions("wave"), { timeout: 10_000 }).toEqual([{ to_id: COLLEAGUE.id }]);

    await tap(page, T1);
    await expect(card.getByRole("group", { name: "Your moves" })).toBeVisible({ timeout: 10_000 });
    await expect(card.getByRole("button", { name: "Wave" })).toHaveCount(0);
    await expect(card.getByRole("link", { name: "Request meeting" })).toHaveCount(0);
    await card.getByRole("button", { name: "Dance" }).click();
    await expect.poll(() => interactions("dance"), { timeout: 10_000 }).toEqual([{ to_id: null }]);
  });

  test("buttons above the map do not click the room underneath", async ({ page }) => {
    test.setTimeout(120_000);
    // Standing here, the popover opens over the meeting room.
    const belowMeetingRoom = { x: 12, y: 12 };
    await checkInAt(COLLEAGUE.id, belowMeetingRoom);
    await signIn(page, WALKER.email);
    await openMap(page);

    await tap(page, belowMeetingRoom);
    const card = page.getByRole("dialog");
    await expect(card.getByRole("group", { name: "Say hello" })).toBeVisible({ timeout: 10_000 });
    await card.getByRole("button", { name: "Close" }).click();
    await expect(card).toBeHidden();
    await page.waitForTimeout(1_000);
    await expect(page).toHaveURL(/\/en\/map$/);
  });

  test("someone not checked in here is pointed to check-in", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, WATCHER.email);
    await openMap(page);
    await tap(page, T3);
    const hint = page.getByTestId("map-hint");
    await expect(hint).toBeVisible({ timeout: 10_000 });
    await expect(hint.getByRole("link", { name: "Check in" })).toHaveAttribute("href", "/en/checkin");
    expect(await savedTile(WATCHER.id)).toBeNull();
  });
});

test.describe("celebrations", () => {
  const MESSAGE = `Thank you for the launch ${Date.now()}`;
  let saved: Record<string, unknown>;

  test.beforeAll(async () => {
    const { data } = await svc.from("profiles").select("birth_month, birth_day, joined_on, celebrate").eq("id", COLLEAGUE.id).single();
    saved = data!;
  });

  test.afterAll(async () => {
    await svc.from("profiles").update(saved).eq("id", COLLEAGUE.id);
    await svc.from("kudos").delete().eq("from_id", WALKER.id);
    await svc.from("notifications").delete().eq("user_id", COLLEAGUE.id).eq("kind", "kudos");
  });

  test("send kudos, see it arrive live in the portal, then delete it", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const portal = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
    await signIn(portal, "sales@test.local");
    await portal.goto("/en/portal/celebrations");
    await expect(portal.getByRole("heading", { name: "Celebrations" })).toBeVisible();
    await portal.waitForTimeout(1_500); // let the live channel join

    await signIn(page, WALKER.email);
    await page.goto("/en/celebrations");
    await page.getByRole("button", { name: "Send kudos" }).first().click();
    const dialog = page.getByRole("dialog");

    // Nothing is sent without a person and a message, and the reason shows beside the field.
    await dialog.getByRole("button", { name: "Send kudos" }).click();
    await expect(dialog.getByText("Choose a colleague").last()).toBeVisible();
    await expect(dialog.getByText("Write a short message")).toBeVisible();

    await dialog.getByRole("combobox").click();
    await page.getByPlaceholder("Search by name").fill("Karim");
    await page.getByRole("option").first().click();
    await dialog.getByRole("radio", { name: "Great idea" }).click();
    await dialog.getByLabel("Message").fill(MESSAGE);
    await dialog.getByRole("button", { name: "Send kudos" }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const card = page.getByTestId("kudos-card").filter({ hasText: MESSAGE });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText("Great idea")).toBeVisible();
    await expect(portal.getByTestId("kudos-card").filter({ hasText: MESSAGE })).toBeVisible({ timeout: 15_000 });
    // Other people's kudos can't be deleted from the portal.
    await expect(portal.getByTestId("kudos-card").filter({ hasText: MESSAGE }).getByRole("button", { name: "Delete kudos" })).toHaveCount(0);

    await card.getByRole("button", { name: "Delete kudos" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(card).toHaveCount(0, { timeout: 10_000 });
    await expect(portal.getByTestId("kudos-card").filter({ hasText: MESSAGE })).toHaveCount(0, { timeout: 15_000 });
    await portal.context().close();
  });

  test("a birthday gets a banner and a one-tap wish, with no year shown", async ({ page }) => {
    test.setTimeout(120_000);
    await svc.from("kudos").delete().eq("from_id", WALKER.id).eq("badge", "birthday");
    const [, month, day] = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }).split("-").map(Number);
    await svc.from("profiles").update({ birth_month: month, birth_day: day, celebrate: true }).eq("id", COLLEAGUE.id);

    await signIn(page, WALKER.email);
    await page.goto("/en/celebrations");
    const banner = page.getByTestId("today-item").filter({ hasText: "birthday" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Send birthday wish" }).click();
    await expect(banner.getByText("Wish sent")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("kudos-card").filter({ hasText: "Birthday wish" }).first()).toBeVisible({ timeout: 10_000 });

    // Sending twice is not possible, even after a reload.
    await page.reload();
    await expect(page.getByTestId("today-item").filter({ hasText: "birthday" }).getByText("Wish sent")).toBeVisible();
  });

  for (const locale of ["en", "ar"]) {
    test(`fits 375px in ${locale}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 375, height: 812 });
      await signIn(page, WALKER.email);
      for (const [email, route] of [[WALKER.email, "/celebrations"], ["sales@test.local", "/portal/celebrations"]]) {
        if (email !== WALKER.email) {
          await page.context().clearCookies();
          await signIn(page, email);
        }
        await page.goto(`/${locale}${route}`);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        await expect(page.getByRole("heading", { name: locale === "ar" ? "المناسبات" : "Celebrations", exact: true })).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${locale}${route}`).toBeLessThanOrEqual(1);
      }
    });
  }

  test("guests are kept out", async ({ page }) => {
    await signIn(page, "guest@test.local");
    await page.goto("/en/celebrations");
    await expect(page).toHaveURL(/\/en\/boards/);
  });
});
