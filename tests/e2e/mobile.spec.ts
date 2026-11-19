import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// D7-02: every route at 375px in English and Arabic, no page-level horizontal overflow.
test.use({ viewport: { width: 375, height: 812 } });

const ROUTES: Record<string, string[]> = {
  "member@test.local": [
    "/my-day", "/meetings", "/gates", "/shoots", "/week", "/celebrations",
    "/map", "/boards", "/boards/60000000-0000-4000-8000-000000000001", "/boards/60000000-0000-4000-8000-000000000003",
    "/my-work", "/approvals", "/requests", "/requests/new", "/calendar", "/content", "/reports/me", "/people", "/people/me",
    "/me/account", "/me/character", "/checkin",
  ],
  "admin@test.local": [
    "/gates/rhythm", "/shoots/new", "/admin/launch", "/admin/seasons", "/admin/rooms",
    "/admin/users", "/admin/branches", "/admin/organisation", "/admin/request-types", "/admin/settings", "/admin/leave", "/admin/audit", "/admin/import",
    "/reports/workflow", "/reports/attendance", "/reports/departments",
  ],
  "sales@test.local": [
    "/portal", "/portal/requests/new", "/portal/week", "/portal/meetings", "/portal/celebrations", "/portal/approvals", "/portal/files",
    "/me/account",
  ],
};

async function check(page: Page, locale: string, path: string) {
  await page.goto(`/${locale}${path}`);
  // "networkidle" is unreliable with live connections (realtime, service worker); wait for the page and its layout instead.
  await page.waitForLoadState("load");
  await page.locator("main").first().waitFor();
  await page.waitForTimeout(500);
  await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  await expect(page.getByText(/Something went wrong|حدث خطأ/)).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${locale}${path} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
}

for (const [email, routes] of Object.entries(ROUTES)) {
  for (const locale of ["en", "ar"]) {
    test(`${email} ${locale}: routes fit 375px`, async ({ page }) => {
      test.setTimeout(300_000);
      await signIn(page, email);
      for (const path of routes) await check(page, locale, path);
    });
  }
}
