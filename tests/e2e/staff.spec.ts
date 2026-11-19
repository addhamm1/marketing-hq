import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// User cases for the real Espaces staff (supabase/seed/08_espaces_people.sql).
// Super admins: Adham, Omnia. Less access: Roaa (traffic). Everyone else: regular employee.

const nav = (page: import("@playwright/test").Page) => page.getByRole("complementary").getByRole("link");

for (const who of [
  { email: "adham@e-spaces.co", admin: true },
  { email: "omnia@e-spaces.co", admin: true },
  { email: "roaa@e-spaces.co", admin: false },
  { email: "mahmoud@e-spaces.co", admin: false },
]) {
  test(`${who.email} gets the team app ${who.admin ? "with" : "without"} Admin`, async ({ page }) => {
    await signIn(page, who.email);
    await page.goto("/en/boards");
    await expect(page.getByRole("heading", { name: "Boards", level: 1 })).toBeVisible();
    await expect(nav(page).filter({ hasText: "Boards" })).toBeVisible();
    await expect(nav(page).filter({ hasText: "Admin" })).toHaveCount(who.admin ? 1 : 0);
    await page.goto("/en/admin/users");
    if (who.admin) {
      await expect(page.getByText("Roaa Reda").first()).toBeVisible();
    } else {
      await expect(page).not.toHaveURL(/\/admin/);
    }
  });
}

test("Asmaa (Sales) lands on the department portal and cannot open the boards", async ({ page }) => {
  await signIn(page, "asmaa@e-spaces.co");
  await expect(page).toHaveURL(/\/portal/);
  await page.goto("/en/boards");
  await expect(page).not.toHaveURL(/\/boards/);
});
