// Validasi peta Depok: login admin, buka /peta, cek Voronoi + RT dots
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE + "/login");
  await page.fill('input[name="email"]', "admin.herozerowaste@gmail.com");
  await page.fill('input[name="password"]', "Testing123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  console.log("login OK");

  await page.goto(BASE + "/peta");
  await page.waitForSelector(".leaflet-container", { timeout: 15000 });
  await page.waitForTimeout(3000);

  const markers = await page.locator(".leaflet-marker-icon").count();
  const paths = await page.locator(".leaflet-overlay-pane path").count();
  const dots = await page.locator(".leaflet-overlay-pane path[fill-opacity='1']").count();
  const tiles = await page.locator(".leaflet-tile-loaded").count();
  const legend = await page.locator("text=ZONASI").count();

  console.log(JSON.stringify({ markers, paths, dots, tiles, legend, errors }, null, 1));

  await page.screenshot({ path: "peta-depok-kota.png", fullPage: false });
  await browser.close();
})();
