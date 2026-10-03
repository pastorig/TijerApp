import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const parent = resolve("src/app/design-preview");
assert.ok(!existsSync(parent), "Preview already exists");
const root = resolve(parent, "public");
const output = resolve(process.env.CAPTURE_DIR || "artifacts/public");
mkdirSync(root, { recursive: true });
mkdirSync(output, { recursive: true });
writeFileSync(resolve(root, "page.tsx"), readFileSync(new URL("./fixtures/admin-shell/public-remaster.tsx", import.meta.url)));
let browser;
const results = [];
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ timezoneId: "America/Argentina/Buenos_Aires", reducedMotion: "reduce" });
  await page.clock.install({ time: new Date("2026-10-02T10:00:00-03:00") });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname.endsWith(".supabase.co")) {
      if (url.pathname.endsWith("/rpc/get_public_barber_day_appointments")) return route.fulfill({ json: [] });
      if (route.request().method() !== "GET") return route.abort();
      if (url.pathname.endsWith("/barbers")) return route.fulfill({ json: [{ id: "demo-barber", name: "Alex Demo", is_active: true, deleted_at: null, barbershop_slug: "design-preview" }] });
      if (url.pathname.endsWith("/barber_services")) return route.fulfill({ json: [{ id: "demo-service", barber_id: "demo-barber", name: "Corte", price: 8500, duration_minutes: 30, is_active: true, deleted_at: null }] });
      return route.fulfill({ json: [] });
    }
    if (url.hostname !== "localhost") return route.abort();
    if (url.pathname.startsWith("/api/")) {
      if (route.request().method() !== "GET") return route.abort();
      if (url.pathname === "/api/waitlist/by-token") return route.fulfill({ json: { entry: { id: "demo", barbershop_slug: "design-preview", barbershop_name: "Studio Demo", barber_name: "Alex Demo", service_name: "Corte", service_duration_minutes: 30, customer_name: "Cliente Demo", customer_phone: "3515550101", preferred_date: "2099-01-01", status: "pending", notes: null } } });
      if (url.pathname === "/api/waitlist/available-slots") return route.fulfill({ json: { available: ["18:00", "18:30"] } });
      return route.fulfill({ json: { data: [] } });
    }
    return route.continue();
  });
  const paths = [["home", "/"], ["producto", "/producto"], ["precios", "/precios"], ["guias", "/guias"], ["login", "/login"], ["registro", "/registro"], ["recuperar", "/recuperar"], ["password", "/nueva-password"], ["offline", "/offline"], ...["publica", "reserva", "turno", "espera", "resena"].map(zone => [zone, "/design-preview/public?zone=" + zone])];
  for (const [zone, path] of paths) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto((process.env.PREVIEW_URL || "http://localhost:3001") + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    if (zone === "publica") await page.getByRole("heading", { name: "Studio Demo", exact: true }).waitFor();
    if (zone === "reserva") await page.getByRole("heading", { name: "Studio Demo", exact: true }).waitFor();
    if (zone === "reserva") {
      const time = page.getByRole("radio", { name: "18:00", exact: true });
      await time.waitFor();
      await time.click();
    }
    const errors = [];
    const unnamedControls = await page.locator("button").evaluateAll(buttons =>
      buttons.filter(button => {
        const visible = button.getBoundingClientRect().width > 0;
        return visible && !button.textContent?.trim() && !button.getAttribute("aria-label") && !button.getAttribute("aria-labelledby") && !button.getAttribute("title");
      }).map(button => button.outerHTML.slice(0, 250)),
    );
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    const zoomOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    await page.evaluate(() => { document.documentElement.style.zoom = ""; });
    let passwordToggle = null;
    if (zone === "login") {
      const password = page.locator('input[autocomplete="current-password"]');
      const toggle = page.getByRole("button", { name: /mostrar contraseña/i });
      if (await toggle.count() && await password.count()) {
        await toggle.click();
        passwordToggle = await password.getAttribute("type") === "text";
        await page.getByRole("button", { name: /ocultar contraseña/i }).click();
        passwordToggle = passwordToggle && await password.getAttribute("type") === "password";
      }
    }
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) errors.push(width);
    }
    await page.screenshot({ path: resolve(output, "resto-" + zone + "-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: resolve(output, "resto-" + zone + "-mobile.png"), fullPage: true });
    await page.screenshot({ path: resolve(output, "resto-" + zone + "-portada.png") });
    results.push({ zone, overflow: errors, zoomOverflow, unnamedControls, passwordToggle });
    console.log(zone + ": " + (errors.length ? "overflow " + errors.join(",") : "responsive OK"));
  }
  assert.ok(results.every(item => item.overflow.length === 0), JSON.stringify(results));
  writeFileSync(resolve(output, "public-audit.json"), JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  unlinkSync(resolve(root, "page.tsx"));
  rmdirSync(root);
  rmdirSync(parent);
}
