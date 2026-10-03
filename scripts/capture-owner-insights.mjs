import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const parent = resolve("src/app/design-preview");
assert.ok(!existsSync(parent), "Do not overwrite an existing preview");
const root = resolve(parent, "owner");
const output = resolve(process.env.CAPTURE_DIR || "artifacts/owner");
mkdirSync(root, { recursive: true });
mkdirSync(output, { recursive: true });
writeFileSync(resolve(root, "page.tsx"), readFileSync(new URL("./fixtures/admin-shell/owner-insights.tsx", import.meta.url)));
let browser;
let scenario = "normal";
const dashboard = process.argv.includes("--dashboard");
const plansView = process.argv.includes("--plans");
const createView = process.argv.includes("--create");
const messagesView = process.argv.includes("--messages");
const historyError = process.argv.includes("--history-error");
let historyRequests = 0;
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ timezoneId: "America/Argentina/Buenos_Aires" });
  await page.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname.endsWith(".supabase.co")) {
      if (!["GET", "HEAD"].includes(request.method())) return route.abort();
      if (url.pathname.endsWith("/user")) return route.fulfill({ json: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "demo@example.com", user_metadata: {}, app_metadata: {}, created_at: "2026-01-01T00:00:00Z" } });
      if (scenario === "error") return route.fulfill({ status: 500, json: { message: "Simulated error" } });
      if (url.pathname.endsWith("/contact_requests")) return route.fulfill({ json: scenario === "empty" ? [] : [0, 1, 2].map(i => ({ id: "message-" + i, name: i === 0 ? "Cliente Demo con nombre compuesto largo" : "Consulta Demo " + i, email: "consulta.demo@example.com", phone: "5493515550101", message: "Quiero conocer los planes disponibles para mi barbería. " + (i === 0 ? "https://example.com/" + "detalle".repeat(25) : ""), created_at: "2026-10-01T12:00:00Z", handled_at: i === 1 ? "2026-10-01T13:00:00Z" : null, deleted_at: i === 2 ? "2026-10-01T13:00:00Z" : null })) });
      if (request.method() === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": "0-1/2" }, body: "" });
      if (url.pathname.endsWith("/barbershops")) return route.fulfill({ json: (dashboard ? ["Studio Demo", "Barberia Demo con un nombre muy extenso para verificar el ajuste", "Salon Demo"] : ["Studio Demo"]).map((name, i) => ({ id: "demo-" + i, slug: "demo-studio-" + i, name, is_active: true })) });
      return route.fulfill({ json: [] });
    }
    if (url.hostname !== "localhost") return route.abort();
    if (url.pathname.startsWith("/api/owner/") && request.method() !== "GET") return route.abort();
    if (url.pathname === "/api/owner/payments") {
      historyRequests++;
      return route.fulfill({ status: historyError ? 500 : 200, json: historyError ? { error: "Simulated failure" } : { payments: [], totalAmount: 0 } });
    }
    if (url.pathname === "/api/owner/plans") return route.fulfill({ status: scenario === "plans-error" ? 500 : 200, json: { plans: [{ slug: "demo-studio", name: "Studio Demo", is_active: true, plan_tier: "pro", status: "active", current_period_ends_at: "2099-01-01T00:00:00Z", trial_expires_at: null, grace_expires_at: null, notes: null }] } });
    return route.continue();
  });
  const base = (process.env.PREVIEW_URL || "http://localhost:3001") + "/design-preview/owner";
  if (historyError) {
    await page.goto(base + "?plans");
    await page.waitForTimeout(1500);
    await page.reload();
    await page.getByText("Error cargando el historial", { exact: true }).first().waitFor();
    const before = historyRequests;
    await page.waitForTimeout(2500);
    assert.ok(historyRequests <= before + 1, "El historial se recarga en bucle al fallar: " + (historyRequests - before) + " nuevas consultas");
    console.log("Error de historial: sin recargas en bucle.");
  } else
  if (messagesView) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "?messages");
    await page.waitForTimeout(1500);
    await page.reload();
    await page.getByText("Cliente Demo con nombre compuesto largo", { exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, "25-owner-mensajes-mobile.png"), fullPage: true });
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.screenshot({ path: resolve(output, "25-owner-mensajes-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "Atendidos", exact: true }).click();
    await page.getByText("Consulta Demo 1", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Eliminados", exact: true }).click();
    await page.getByRole("button", { name: "Restaurar", exact: true }).waitFor();
    await page.getByRole("button", { name: "Todos", exact: true }).click();
    assert.equal(await page.locator("main li").count(), 2);
    scenario = "error";
    await page.reload();
    await page.getByRole("button", { name: "Reintentar" }).waitFor();
    assert.equal(await page.getByText("No hay mensajes acá", { exact: true }).count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: resolve(output, "25-owner-mensajes-error.png"), fullPage: true });
    await page.getByRole("button", { name: "Atendidos", exact: true }).click();
    scenario = "normal";
    await page.getByRole("button", { name: "Reintentar" }).click();
    await page.getByText("Consulta Demo 1", { exact: true }).waitFor();
    scenario = "empty";
    await page.reload();
    await page.getByText("No hay mensajes acá", { exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, "25-owner-mensajes-vacio.png"), fullPage: true });
    console.log("Messages: responsive, long text, filters, error/retry preserving filter and empty state passed. Writes blocked.");
  } else if (createView) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "?create");
    await page.waitForTimeout(1500);
    await page.reload();
    await page.getByRole("heading", { name: "Nueva barbería" }).waitFor();
    await page.screenshot({ path: resolve(output, "24-owner-alta-mobile.png"), fullPage: true });
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.screenshot({ path: resolve(output, "24-owner-alta-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    await page.getByRole("button", { name: "Quitar", exact: true }).nth(1).click();
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    const names = page.getByRole("textbox", { name: "Nombre del servicio", exact: true });
    await names.nth(2).fill("Servicio independiente");
    assert.equal(await names.nth(1).inputValue(), "");
    assert.equal(await names.count(), 3);
    await page.getByRole("button", { name: "Mostrar contraseña", exact: true }).click();
    assert.equal(await page.locator("#admin-password").getAttribute("type"), "text");
    await page.getByRole("checkbox").check();
    assert.equal(await page.locator("#admin-password").count(), 0);
    console.log("Owner alta: responsive, independent services after removal/addition, password visibility and automatic password passed; writes blocked.");
  } else if (plansView) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "?plans");
    await page.waitForTimeout(1500);
    await page.reload();
    await page.getByRole("button", { name: "Registrar pago", exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, "23-owner-planes-mobile.png"), fullPage: true });
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.screenshot({ path: resolve(output, "23-owner-planes-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 650 });
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await page.screenshot({ path: resolve(output, "23-owner-editar-mobile.png"), fullPage: true });
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.getByRole("button", { name: "Registrar pago", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await page.screenshot({ path: resolve(output, "23-owner-pago-mobile.png"), fullPage: true });
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
    scenario = "plans-error";
    await page.reload();
    await page.getByText("No pudimos cargar los planes.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Reintentar" }).waitFor();
    scenario = "normal";
    await page.getByRole("button", { name: "Reintentar" }).click();
    await page.getByRole("button", { name: "Registrar pago", exact: true }).waitFor();
    console.log("Owner plans: responsive, edit/payment dialogs and error/retry passed. Writes blocked.");
  } else if (dashboard) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "?dashboard");
    await page.waitForTimeout(1500);
    await page.getByRole("heading", { name: "Studio Demo", exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, "22-owner-listado-mobile.png"), fullPage: true });
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No overflow at " + width);
    }
    await page.screenshot({ path: resolve(output, "22-owner-listado-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "A–Z", exact: true }).click();
    await page.getByRole("textbox", { name: "Buscar barbería" }).fill("no-existe");
    await page.getByText("No hay barberías que coincidan con", { exact: false }).waitFor();
    await page.getByRole("button", { name: "Limpiar búsqueda", exact: true }).first().click();
    await page.getByRole("heading", { name: "Studio Demo", exact: true }).waitFor();
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name: "Studio Demo", exact: true }) });
    assert.equal(await card.getByRole("link", { name: "Abrir admin" }).getAttribute("href"), "/demo-studio-0/admin");
    await card.getByRole("button", { name: /Más acciones/ }).click();
    await card.getByRole("menu").waitFor();
    await page.keyboard.press("Escape");
    await card.getByRole("menu").waitFor({ state: "hidden" });
    console.log("Owner listado: responsive, long names, search, sort, links and action menu passed; mutations blocked.");
  } else {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByRole("heading", { name: "Resumen de la plataforma" }).waitFor();
  await page.screenshot({ path: resolve(output, "21-owner-insights-mobile.png"), fullPage: true });
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No overflow at " + width);
  }
  await page.screenshot({ path: resolve(output, "21-owner-insights-desktop.png"), fullPage: true });
  scenario = "error";
  await page.reload();
  await page.getByText("No pudimos cargar el resumen de la plataforma.").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(output, "21-owner-insights-error.png"), fullPage: true });
  scenario = "normal";
  await page.getByRole("button", { name: "Reintentar" }).click();
  await page.getByRole("heading", { name: "Resumen de la plataforma" }).waitFor();
  scenario = "plans-error";
  await page.reload();
  await page.getByText("Los importes no están disponibles: falló la carga de planes.").waitFor();
  await page.screenshot({ path: resolve(output, "21-owner-insights-plans-error.png"), fullPage: true });
  scenario = "normal";
  await page.getByRole("button", { name: "Reintentar" }).click();
  await page.getByRole("heading", { name: "Resumen de la plataforma" }).waitFor();
  await page.getByText("Los importes no están disponibles: falló la carga de planes.").waitFor({ state: "hidden" });
  console.log("Owner insights: responsive, metrics error/retry and plans error/retry passed. External mutations blocked.");
  }
} finally {
  await browser?.close();
  unlinkSync(resolve(root, "page.tsx"));
  rmdirSync(root);
  rmdirSync(parent);
}
