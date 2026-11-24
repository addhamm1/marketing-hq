import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { type NavGrid, type Rect, type Tile, isSeat, isWalkable, parseNavGrid } from "../../src/game/life/grid";
import { findPath } from "../../src/game/life/path";
import { signIn } from "./helpers";

// Journeys across screens: each one starts on one screen and is checked on another,
// often by a second person in a browser of their own.
test.describe.configure({ mode: "serial" });

const TAG = `E2E scenario ${Date.now()}`;
const PIPELINE = "60000000-0000-4000-8000-000000000001";
const HQ_BRANCH = "30000000-0000-4000-8000-000000000001";
const HQ = { latitude: 30.096, longitude: 31.326, accuracy: 15 };
const MEMBER = "00000000-0000-4000-8000-000000000006";
const MEMBER2 = "00000000-0000-4000-8000-000000000007";
const COMMUNITY = "00000000-0000-4000-8000-000000000008";
// A week far ahead that no other spec uses. 6 March 2032 is a Saturday.
const WEEK = "2032-03-06";
const MONDAY = /Monday,? 8 March/;

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const at = new Date();
const GATE_MONTH = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 5, 1)).toISOString().slice(0, 7);

/** Cairo date and minutes since midnight right now. */
function cairoNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

async function person(browser: Browser, email: string, options: BrowserContextOptions = {}) {
  const context = await browser.newContext({ locale: "en-US", timezoneId: "Africa/Cairo", baseURL: test.info().project.use.baseURL, ...options });
  const page = await context.newPage();
  await signIn(page, email);
  return page;
}

async function pick(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).first().click();
}

async function checkOut(userId: string) {
  const { data } = await svc.from("attendance_sessions").select("id, checked_in_at").eq("user_id", userId).is("checked_out_at", null);
  for (const s of data ?? []) {
    const out = new Date(Math.max(Date.now(), Date.parse(s.checked_in_at) + 1000)).toISOString();
    await svc.from("attendance_sessions").update({ checked_out_at: out }).eq("id", s.id);
  }
}

// The map: open floor tiles, the same way the map spec finds them.
const map = JSON.parse(readFileSync(path.resolve("public/maps/hq.json"), "utf8")) as {
  layers: { name: string; objects?: (Rect & { x: number; y: number })[] }[];
};
const grid = parseNavGrid(map) as NavGrid;
const zones = map.layers.find((l) => l.name === "zones")?.objects ?? [];
const signs = map.layers.find((l) => l.name === "signs")?.objects ?? [];
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
const [T1, T2] = [openFloor[0], openFloor[Math.floor(openFloor.length / 2)]];

async function tap(page: Page, tile: Tile) {
  const box = (await page.getByTestId("pixel-map").boundingBox())!;
  const [mapW, mapH] = [grid.width * grid.tileSize, grid.height * grid.tileSize];
  const zoom = Math.min(box.width / mapW, box.height / mapH);
  await page.mouse.click(
    box.x + box.width / 2 + ((tile.x + 0.5) * grid.tileSize - mapW / 2) * zoom,
    box.y + box.height / 2 + ((tile.y + 0.5) * grid.tileSize - mapH / 2) * zoom,
  );
}

test.afterAll(async () => {
  const { data: cards } = await svc.from("cards").select("id").like("title", `${TAG}%`);
  const cardIds = (cards ?? []).map((c) => c.id);
  const { data: meetings } = await svc.from("meetings").select("id").like("title", `${TAG}%`);
  for (const m of meetings ?? []) await svc.from("notifications").delete().eq("data->>meeting_id", m.id);
  if (meetings?.length) await svc.from("meetings").delete().in("id", meetings.map((m) => m.id));
  for (const id of cardIds) await svc.from("notifications").delete().eq("data->>card_id", id);
  if (cardIds.length) {
    await svc.from("approval_steps").delete().eq("subject_type", "card").in("subject_id", cardIds);
    await svc.from("cards").delete().in("id", cardIds);
  }
  const { data: kudos } = await svc.from("kudos").select("id").like("message", `${TAG}%`);
  for (const k of kudos ?? []) await svc.from("notifications").delete().eq("data->>kudos_id", k.id);
  if (kudos?.length) await svc.from("kudos").delete().in("id", kudos.map((k) => k.id));
  await svc.from("week_plan_entries").delete().eq("user_id", MEMBER).gte("day", WEEK).lte("day", "2032-03-11");
  await svc.from("gate_item_exclusions").delete().eq("month", `${GATE_MONTH}-01`);
  await svc.from("gate_items").delete().eq("month", `${GATE_MONTH}-01`);
  await checkOut(MEMBER2);
  await checkOut(COMMUNITY);
  await svc.from("map_positions").delete().in("user_id", [MEMBER2, COMMUNITY]);
});

test.describe("a department request", () => {
  const title = `${TAG} urgent request`;
  const reason = "Please add the offer dates";
  let cardId = "";

  test("the requester submits it in the portal and finds it in the tracker", async ({ browser }) => {
    test.setTimeout(120_000);
    const sales = await person(browser, "sales@test.local");
    await sales.goto("/en/portal/requests/new");
    await sales.getByRole("tab", { name: "Urgent request" }).click();
    await sales.getByLabel("Title").fill(title);
    await sales.getByLabel("Objective").fill("Fill the event seats");
    await pick(sales, "Vertical", "Daily Reservation");
    await pick(sales, "Brand", "Espaces");
    await pick(sales, "Format", "static");
    await sales.getByLabel("Due date").fill("2027-02-01T12:00");
    await sales.getByRole("button", { name: "Instagram" }).click();
    await sales.getByLabel("Why is it urgent?").fill("The event moved forward");
    await sales.getByRole("button", { name: "Submit urgent request" }).click();
    await sales.waitForURL(/\/portal\/requests\/[0-9a-f-]{36}/);
    cardId = sales.url().split("/").pop()!;

    await sales.goto("/en/portal");
    const row = sales.getByTestId("tracker-row").filter({ hasText: title });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText("Needs your action")).toHaveCount(0);
    await sales.context().close();
  });

  test("traffic moves it on the board: no performance input, then back to the requester", async ({ browser }) => {
    test.setTimeout(120_000);
    const traffic = await person(browser, "traffic@test.local");
    await traffic.goto(`/en/boards/${PIPELINE}?card=${cardId}`);
    const sheet = traffic.getByRole("dialog");
    await expect(sheet.getByText(title).first()).toBeVisible({ timeout: 20_000 });

    await sheet.getByRole("button", { name: "Add visual suggestions" }).click();
    await traffic.getByRole("dialog").last().getByRole("button", { name: "No input" }).click();
    await expect(traffic.getByText("Moved to Intake").first()).toBeVisible();

    await traffic.getByRole("button", { name: "Return to requester" }).first().click();
    const dialog = traffic.getByRole("dialog").last();
    await dialog.getByLabel("Reason").fill(reason);
    await dialog.getByRole("button", { name: "Return to requester" }).click();
    await expect(traffic.getByText("Moved to Request").first()).toBeVisible();

    const { data } = await svc.from("cards").select("stage, returned_reason").eq("id", cardId).single();
    expect(data).toEqual({ stage: "request", returned_reason: reason });
    await traffic.context().close();
  });

  test("the requester sees the new status and a notification", async ({ browser }) => {
    test.setTimeout(120_000);
    const sales = await person(browser, "sales@test.local");
    await sales.goto("/en/portal");
    await sales.getByRole("group", { name: "Filter requests" }).getByRole("button", { name: /Needs action/ }).click();
    await expect(sales.getByTestId("tracker-row").filter({ hasText: title }).getByText("Needs your action")).toBeVisible({ timeout: 20_000 });

    await sales.getByRole("button", { name: /^Notifications \(\d+\)$/ }).first().click();
    const notice = sales.getByRole("button", { name: new RegExp(`Your request “${title}” was returned: ${reason}`) });
    await expect(notice).toBeVisible();
    await notice.click();
    await expect(sales).toHaveURL(new RegExp(`/en/portal/requests/${cardId}$`));
    const panel = sales.getByTestId("returned-panel");
    await expect(panel.getByRole("heading", { name: "Needs your action: update this request" })).toBeVisible({ timeout: 20_000 });
    await expect(panel.getByText(reason)).toBeVisible();
    await sales.context().close();
  });
});

test.describe("a meeting from the map", () => {
  const title = `${TAG} meeting`;
  const action = `${TAG} send the brief`;
  let meetingPath = "";

  test.beforeAll(async () => {
    await checkOut(MEMBER2);
    await checkOut(COMMUNITY);
    const { error } = await svc.rpc("check_in", {
      p_user_id: COMMUNITY, p_method: "wifi", p_branch_id: HQ_BRANCH, p_lat: HQ.latitude, p_lng: HQ.longitude, p_accuracy_m: 10, p_verify: { test: true },
    });
    if (error) throw error;
    await svc.from("map_positions").upsert({ user_id: COMMUNITY, branch_id: HQ_BRANCH, tile_x: T2.x, tile_y: T2.y });
  });

  test("a member checks in, opens a colleague on the map and books a meeting from the popover link", async ({ browser }) => {
    const now = cairoNow();
    const start = Math.ceil((now.minutes + 15) / 5) * 5;
    test.skip(start > 23 * 60 + 25, "too late in the Cairo day to book a meeting for today");
    test.setTimeout(180_000);

    const page = await person(browser, "member2@test.local", { geolocation: HQ, permissions: ["geolocation"] });
    await page.goto("/en/checkin");
    await page.getByRole("button", { name: "Check in", exact: true }).click();
    await expect(page.getByText(/Checked in at Marketing HQ since/)).toBeVisible({ timeout: 20_000 });
    await svc.from("map_positions").upsert({ user_id: MEMBER2, branch_id: HQ_BRANCH, tile_x: T1.x, tile_y: T1.y });

    await page.goto("/en/map");
    await expect(page.getByTestId("pixel-map").locator("canvas")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(3_000); // the map, zones and avatars load inside the canvas
    await tap(page, T2);
    const card = page.getByRole("dialog");
    await expect(card.getByRole("group", { name: "Say hello" })).toBeVisible({ timeout: 10_000 });
    await card.getByRole("link", { name: "Request meeting" }).click();
    await expect(page).toHaveURL(new RegExp(`/en/meetings\\?new=1&with=${COMMUNITY}`));

    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "New meeting" })).toBeVisible();
    await expect(sheet.getByRole("list", { name: "Selected people" }).getByRole("listitem")).toHaveCount(1);
    await sheet.getByLabel("Title").fill(title);
    await sheet.getByLabel("Date").fill(now.date);
    await sheet.getByLabel("Start time").fill(`${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`);
    await sheet.getByLabel("Agenda").fill("Launch plan");
    await sheet.getByRole("button", { name: "Book meeting" }).click();
    await expect(page).toHaveURL(/\/en\/meetings\/[0-9a-f-]{36}$/);
    meetingPath = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();

    // It is on My Day and in the meetings list.
    await page.goto("/en/my-day");
    await expect(page.getByTestId("section-meetings").getByTestId("meeting-row").filter({ hasText: title })).toBeVisible({ timeout: 20_000 });
    await page.goto("/en/meetings");
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible({ timeout: 20_000 });

    // The colleague finds the invitation on their My Day.
    const colleague = await person(browser, "community@test.local");
    await colleague.goto("/en/my-day");
    await expect(colleague.getByTestId("meeting-row").filter({ hasText: title }).getByText("Waiting for your reply")).toBeVisible({ timeout: 20_000 });
    await colleague.context().close();
    await page.context().close();
  });

  test("an action from the meeting becomes a card on the board", async ({ browser }) => {
    test.skip(!meetingPath, "needs the meeting booked above");
    test.setTimeout(120_000);
    const page = await person(browser, "member2@test.local");
    await page.goto(meetingPath);
    await page.getByLabel("Action", { exact: true }).fill(action);
    await page.getByLabel("Owner").click();
    await page.getByRole("option", { name: /Karim/ }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(action)).toBeVisible();
    await page.getByRole("button", { name: "Make it a card" }).click();
    const open = page.getByRole("link", { name: "Open card" });
    await expect(open).toBeVisible({ timeout: 15_000 });
    await open.click();
    await expect(page).toHaveURL(/\/en\/boards\/60000000-0000-4000-8000-000000000010/);
    await expect(page.getByRole("dialog").getByText(action).first()).toBeVisible({ timeout: 20_000 });
    await page.context().close();

    // The owner sees the card on the Meeting actions board, assigned to them.
    const owner = await person(browser, "community@test.local");
    await owner.goto("/en/boards/60000000-0000-4000-8000-000000000010");
    await expect(owner.getByText(action).first()).toBeVisible({ timeout: 20_000 });
    const { data } = await svc.from("cards").select("card_assignees(user_id)").eq("title", action).single();
    expect(data?.card_assignees).toEqual([{ user_id: COMMUNITY }]);
    await owner.context().close();
  });
});

test("a gate status change shows on the gates page for everyone", async ({ browser }) => {
  test.setTimeout(120_000);
  const traffic = await person(browser, "traffic@test.local");
  await traffic.goto(`/en/gates?month=${GATE_MONTH}`);
  const timeline = traffic.getByTestId("gates-timeline");
  await expect(timeline).toBeVisible({ timeout: 20_000 });
  await timeline.getByRole("button", { name: /^Gate 25: everything approved and scheduled/ }).click();
  const sheet = traffic.getByRole("dialog");
  await sheet.getByLabel("Status").click();
  await traffic.getByRole("option", { name: "Done" }).click();
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(traffic.getByRole("dialog")).toBeHidden();
  await traffic.context().close();

  const member = await person(browser, "member@test.local");
  await member.goto(`/en/gates?month=${GATE_MONTH}`);
  const gate = member.getByTestId("gates-timeline").getByRole("button", { name: /^Gate 25: everything approved and scheduled/ });
  await expect(gate).toHaveAccessibleName(/, Done/, { timeout: 20_000 });
  await expect(member.getByTestId("gates-summary")).toContainText("1 of");
  await member.context().close();
});

test("a planned day on Team week shows for another department", async ({ browser }) => {
  test.setTimeout(120_000);
  const place = `${TAG} client office`.slice(0, 60);
  const member = await person(browser, "member@test.local");
  await member.goto(`/en/week?week=${WEEK}`);
  const row = member.getByTestId(`week-row-${MEMBER}`);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole("button", { name: MONDAY }).click();
  const dialog = member.getByRole("dialog");
  await dialog.getByRole("radio", { name: "In the field" }).click();
  await dialog.getByLabel("Place name").fill(place);
  await dialog.getByRole("button", { name: "Save plan" }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await expect(row.getByText(place)).toBeVisible({ timeout: 15_000 });
  await member.context().close();

  const sales = await person(browser, "sales@test.local");
  await sales.goto(`/en/portal/week?week=${WEEK}`);
  await expect(sales.getByTestId(`week-row-${MEMBER}`).getByText(place)).toBeVisible({ timeout: 20_000 });
  await sales.context().close();
});

test("kudos sent from Celebrations reach the colleague and the portal", async ({ browser }) => {
  test.setTimeout(120_000);
  const message = `${TAG} thanks for the shoot`;
  const sender = await person(browser, "member@test.local");
  await sender.goto("/en/celebrations");
  await sender.getByRole("button", { name: "Send kudos" }).first().click();
  const dialog = sender.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await sender.getByPlaceholder("Search by name").fill("Marwan");
  await sender.getByRole("option").first().click();
  await dialog.getByRole("radio", { name: "Great idea" }).click();
  await dialog.getByLabel("Message").fill(message);
  await dialog.getByRole("button", { name: "Send kudos" }).click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  await expect(sender.getByTestId("kudos-card").filter({ hasText: message })).toBeVisible({ timeout: 10_000 });
  await sender.context().close();

  const recipient = await person(browser, "member2@test.local");
  await recipient.goto("/en/celebrations");
  await expect(recipient.getByTestId("kudos-card").filter({ hasText: message })).toBeVisible({ timeout: 20_000 });
  await recipient.getByRole("button", { name: /^Notifications \(\d+\)$/ }).first().click();
  await expect(recipient.getByRole("button", { name: /sent you kudos/ }).first()).toBeVisible();
  await recipient.context().close();

  const portal = await person(browser, "sales@test.local");
  await portal.goto("/en/portal/celebrations");
  await expect(portal.getByTestId("kudos-card").filter({ hasText: message })).toBeVisible({ timeout: 20_000 });
  await portal.context().close();
});
