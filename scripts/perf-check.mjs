// Mobile performance check against a production build (D7-03).
// Usage: node scripts/perf-check.mjs http://localhost:3100
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const routes = ["/en/map", "/en/boards/60000000-0000-4000-8000-000000000003", "/en/my-work", "/en/content"];

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["Pixel 7"] });
const page = await context.newPage();
await page.goto(`${base}/en/sign-in`);
await page.getByLabel("Work email").fill("member@test.local");
await page.getByLabel("Password", { exact: true }).fill("Test1234!");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/map/);

const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const rows = [];
for (const route of routes) {
  let js = 0;
  const onResponse = async (res) => {
    if (res.request().resourceType() === "script") js += Number(res.headers()["content-length"] ?? (await res.body().catch(() => Buffer.alloc(0))).length);
  };
  page.on("response", onResponse);
  await page.evaluate(() => window.__lcp = 0).catch(() => {});
  const t0 = Date.now();
  await page.goto(`${base}${route}`, { waitUntil: "load" });
  const lcp = await page.evaluate(() => new Promise((resolve) => {
    let v = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) v = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    setTimeout(() => resolve(Math.round(v)), 1500);
  }));
  const cls = await page.evaluate(() => new Promise((resolve) => {
    let v = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: "layout-shift", buffered: true });
    setTimeout(() => resolve(Number(v.toFixed(3))), 500);
  }));
  rows.push({ route, loadMs: Date.now() - t0, lcpMs: lcp, cls, jsKB: Math.round(js / 1024) });
  page.off("response", onResponse);
}
console.table(rows);

// Map: navigate away and back five times, then check the console stayed clean.
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
for (let i = 0; i < 5; i++) {
  await page.goto(`${base}/en/map`);
  await page.waitForTimeout(1200);
  await page.goto(`${base}/en/my-work`);
}
const canvases = await page.goto(`${base}/en/map`).then(() => page.waitForTimeout(1500)).then(() => page.locator("canvas").count());
console.log(JSON.stringify({ mapNavigationErrors: errors, canvasesOnMap: canvases }));
await browser.close();
