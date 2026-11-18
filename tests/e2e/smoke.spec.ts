import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("a member signs in and sees the team shell", async ({ page }) => {
  await signIn(page, "member@test.local");
  await expect(page).toHaveURL(/\/en\/my-day/);
  await expect(page.getByRole("link", { name: "Boards" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
});

test("a requester lands on the portal and cannot open team routes", async ({ page }) => {
  await signIn(page, "sales@test.local");
  await expect(page).toHaveURL(/\/en\/portal/);
  await page.goto("/en/boards");
  await expect(page).toHaveURL(/\/en\/portal/);
});

test("wrong password shows a generic error", async ({ page }) => {
  await page.goto("/en/sign-in");
  await page.getByLabel("Work email").fill("member@test.local");
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Email or password is incorrect.").first()).toBeVisible();
});

test("Arabic renders right to left", async ({ page }) => {
  await page.goto("/ar/sign-in");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "تسجيل الدخول إلى Marketing HQ" })).toBeVisible();
});
