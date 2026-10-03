import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const credentialsPath = join(homedir(), "Desktop", "tijerapp-qa.env");
assert.ok(existsSync(credentialsPath), "Falta tijerapp-qa.env en el Escritorio local.");
process.loadEnvFile(credentialsPath);
const { QA_BASE_URL, QA_BARBERSHOP_SLUG, QA_EMAIL, QA_PASSWORD } = process.env;
assert.ok(QA_PASSWORD, "Completa QA_PASSWORD en tijerapp-qa.env. No la publiques.");
assert.equal(QA_BARBERSHOP_SLUG, "primebarber", "Esta prueba solo admite Primebarber.");
const base = new URL(QA_BASE_URL);
assert.ok(["localhost", "127.0.0.1", "tijerapp.com", "www.tijerapp.com", "tijerapp.vercel.app"].includes(base.hostname), "Destino QA no permitido.");
assert.ok(base.protocol === "https:" || ["localhost", "127.0.0.1"].includes(base.hostname), "El login remoto requiere HTTPS.");
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  let databaseAccess = null;
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.hostname.endsWith(".supabase.co") && url.pathname === "/rest/v1/appointments") {
      const headers = request.headers();
      if (headers.authorization && headers.apikey) databaseAccess = { origin: url.origin, authorization: headers.authorization, apikey: headers.apikey };
    }
  });
  // Solo se permite autenticar y leer: no reservar, notificar o modificar datos.
  await page.route("**/*", route => {
    const request = route.request();
    const url = new URL(request.url());
    const authentication = url.hostname.endsWith(".supabase.co")
      && url.pathname === "/auth/v1/token"
      && url.searchParams.get("grant_type") === "password"
      && request.method() === "POST";
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && !authentication) return route.abort();
    return route.continue();
  });
  await page.goto(new URL("/login?next=/primebarber/admin", base).href);
  await page.locator("#global-email").fill(QA_EMAIL);
  await page.locator("#global-password").fill(QA_PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/primebarber/admin", { timeout: 30000 });
  console.log("Login QA: redireccion a Primebarber correcta. No se modificaron datos.");
  const output = join(homedir(), ".codex", "visualizations", "2026", "05", "25", "019e5ca0-6447-7770-9c50-01c1f136cfb5", "tijerapp-remaster");
  mkdirSync(output, { recursive: true });
  const results = [];
  let failures = [];
  let runtimeErrors = 0;
  page.on("pageerror", () => { runtimeErrors++; });
  page.on("response", response => {
    if (response.status() >= 400) {
      const url = new URL(response.url());
      failures.push({ path: url.pathname, status: response.status() });
    }
  });
  const sections = process.env.QA_SECTIONS?.split(",") ?? ["", "turnero", "clientes", "barbers", "equipo", "reportes", "cierre", "cobros", "settings", "galeria", "recordatorios", "lista-espera", "resenas", "fidelizacion", "cupones"];
  for (const section of sections) {
    failures = [];
    runtimeErrors = 0;
    const route = "/primebarber/admin" + (section ? "/" + section : "");
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(new URL(route, base).href, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    if (!section) {
      const trigger = page.getByRole("button", { name: "Abrir menu", exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Navegacion principal" });
      await dialog.waitFor({ state: "visible" });
      for (let index = 0; index < 18; index++) {
        await page.keyboard.press("Tab");
        assert.ok(await dialog.evaluate(element => element.contains(document.activeElement)), "El foco salio del menu admin.");
      }
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.ok(await trigger.evaluate(element => element === document.activeElement), "El foco no regreso al boton del menu.");
      console.log("Menu mobile: foco contenido, Escape y retorno de foco correctos.");
    }
    const overflow = [];
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) overflow.push(width);
    }
    const alertMessages = await page.getByRole("alert").allTextContents();
    const alerts = alertMessages.length;
    const headings = await page.locator("h1, h2").allTextContents();
    const hasMain = await page.getByRole("main").count() > 0;
    results.push({ section: section || "inicio", status: response?.status(), destination: new URL(page.url()).pathname, overflow, alerts, alertMessages, headings, hasMain, runtimeErrors, failures: [...failures] });
    console.log((section || "inicio") + ": HTTP " + response?.status() + ", overflow=" + overflow.length + ", alertas=" + alerts + ", errores JS=" + runtimeErrors + ", respuestas fallidas=" + failures.length);
  }
  writeFileSync(join(output, "primebarber-readonly-audit.json"), JSON.stringify(results, null, 2));
  const permissions = [];
  if (databaseAccess) {
    const { origin, authorization, apikey } = databaseAccess;
    for (const slug of ["primebarber", "sv-barber"]) {
      const response = await page.request.get(origin + "/rest/v1/appointments", {
        headers: { Authorization: authorization, apikey },
        params: { select: "id", barbershop_slug: "eq." + slug, limit: "1" },
      });
      const data = await response.json();
      permissions.push({ check: "RLS appointments " + slug, status: response.status(), visibleRows: Array.isArray(data) ? data.length : null });
    }
    for (const path of ["/api/admin/team?barbershopSlug=sv-barber", "/api/owner/plans"]) {
      const response = await page.request.get(new URL(path, base).href, { headers: { Authorization: authorization } });
      permissions.push({ check: path, status: response.status() });
    }
  }
  writeFileSync(join(output, "primebarber-permissions-audit.json"), JSON.stringify(permissions, null, 2));
  console.log("Permisos revisados con consultas de lectura: " + permissions.length + ". Sin tokens guardados.");
  console.log("Informe de lectura guardado; no contiene contrasenas ni tokens.");
} catch {
  console.error("No se pudo verificar el acceso QA. Revisa credenciales, servidor y permiso de Primebarber.");
  process.exitCode = 1;
} finally {
  // No se guarda storageState, cookies, trazas ni credenciales.
  await browser.close();
}
