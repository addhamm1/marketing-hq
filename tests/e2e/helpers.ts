import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Test1234!";

export async function signIn(page: Page, email: string, password = PASSWORD, locale = "en") {
  await page.goto(`/${locale}/sign-in`);
  await page.getByLabel(locale === "ar" ? "بريد العمل" : "Work email").fill(email);
  await page.getByLabel(locale === "ar" ? "كلمة المرور" : "Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: locale === "ar" ? "تسجيل الدخول" : "Sign in" }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}
