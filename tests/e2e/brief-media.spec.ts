import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// M-03: drag-and-drop brief media. Two files picked into a card's brief show as thumbnails.
const PIPELINE = "60000000-0000-4000-8000-000000000001";
const BRAND = "40000000-0000-4000-8000-000000000001";
const SALES_DEPT = "10000000-0000-4000-8000-000000000002";
const TRAFFIC = "00000000-0000-4000-8000-000000000003";

// 8x8 PNGs in two colours.
const RED = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM4oaGBFTEMLQkAgl1GAWqNFmsAAAAASUVORK5CYII=", "base64");
const BLUE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGPQCDiBFTEMLQkAGplQAcFH9hEAAAAASUVORK5CYII=", "base64");

async function makeCard() {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: list } = await svc.from("lists").select("id").eq("board_id", PIPELINE).eq("stage", "brief_schedule").single();
  const { data, error } = await svc
    .from("cards")
    .insert({
      board_id: PIPELINE, list_id: list!.id, position: `a0${Date.now().toString(36)}`, title: `E2E reference upload ${Date.now()}`,
      stage: "brief_schedule", request_kind: "strategic", requesting_department_id: SALES_DEPT, brand_id: BRAND,
      platforms: ["instagram"], created_by: TRAFFIC,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

test("traffic drops two files into a card brief and sees thumbnails", async ({ page }) => {
  const cardId = await makeCard();
  await signIn(page, "traffic@test.local");
  await page.goto(`/en/cards/${cardId}`);
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Brief media", exact: true })).toBeVisible({ timeout: 15_000 });

  await sheet.getByTestId("file-input").setInputFiles([
    { name: "moodboard-red.png", mimeType: "image/png", buffer: RED },
    { name: "moodboard-blue.png", mimeType: "image/png", buffer: BLUE },
  ]);

  const tiles = sheet.getByTestId("media-tile");
  await expect(tiles).toHaveCount(2, { timeout: 20_000 });
  for (const tile of await tiles.all()) await expect(tile.locator("img")).toBeVisible();

  // Lightbox preview opens with a download button.
  await tiles.first().click();
  const lightbox = page.getByRole("dialog", { name: /moodboard-/ });
  await expect(lightbox.getByRole("button", { name: "Download" })).toBeVisible();
  await lightbox.getByRole("button", { name: "Close" }).click();
  await expect(lightbox).toBeHidden();
  const sheetAgain = page.getByRole("dialog", { name: /E2E reference upload/ });
  await expect(sheetAgain).toBeVisible();

  // A reference link is added from the same section.
  await sheetAgain.getByPlaceholder("Paste a Drive, WeTransfer or any link").fill("we.tl/t-e2e");
  await sheet.getByRole("button", { name: "Add link" }).click();
  await expect(sheet.getByRole("link", { name: /WeTransfer/ })).toBeVisible();

  // Wrong file types are refused with a friendly message.
  await sheet.getByTestId("file-input").setInputFiles([{ name: "setup.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") }]);
  await expect(page.getByText("setup.exe can't be uploaded")).toBeVisible();
});

test("sales attaches reference media while writing an urgent request", async ({ page }) => {
  const title = `E2E urgent with media ${Date.now()}`;
  await signIn(page, "sales@test.local");
  await page.goto("/en/portal/requests/new");
  await page.getByRole("tab", { name: "Urgent request" }).click();
  const panel = page.getByRole("tabpanel");

  // Files upload straight away, before the request (and its card) exists.
  await panel.getByTestId("file-input").setInputFiles([{ name: "reference.png", mimeType: "image/png", buffer: RED }]);
  await expect(panel.getByTestId("upload-item")).toHaveAttribute("data-status", "done", { timeout: 20_000 });

  await panel.getByLabel("Title").fill(title);
  await panel.getByLabel("Objective").fill("Launch the new branch");
  for (const [label, option] of [["Vertical", "Daily Reservation"], ["Brand", "Espaces"], ["Format", "static"]] as const) {
    await panel.getByRole("combobox", { name: label }).click();
    await page.getByRole("option", { name: option }).first().click();
  }
  await panel.getByLabel("Due date").fill("2027-02-01T12:00");
  await panel.getByRole("button", { name: "Instagram" }).click();
  await panel.getByLabel("Why is it urgent?").fill("Opening moved up");
  await panel.getByRole("button", { name: "Submit urgent request" }).click();
  await page.waitForURL(/\/portal\/requests\/[0-9a-f-]{36}/);

  // The staged file was moved into the new card and shows in its gallery.
  await expect(page.getByTestId("media-tile")).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByTestId("media-tile").locator("img")).toBeVisible();
});
