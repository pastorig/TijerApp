import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://localhost:3001";
const output = resolve(process.env.CAPTURE_DIR || "artifacts/admin-shell");
mkdirSync(output, { recursive: true });
const baseline = process.argv.includes("--baseline");
const dashboard = process.argv.includes("--dashboard");
const agenda = process.argv.includes("--agenda");
const clients = process.argv.includes("--clients");
const barbers = process.argv.includes("--barbers");
const team = process.argv.includes("--team");
const reports = process.argv.includes("--reports");
const closing = process.argv.includes("--closing");
const payments = process.argv.includes("--payments");
const settings = process.argv.includes("--settings");
const gallery = process.argv.includes("--gallery");
const reminders = process.argv.includes("--reminders");
const waitlist = process.argv.includes("--waitlist");
const reviews = process.argv.includes("--reviews");
const loyalty = process.argv.includes("--loyalty");
const coupons = process.argv.includes("--coupons");
const staffAccount = process.argv.includes("--staff-account");
const staffModals = process.argv.includes("--staff-modals");
const staff = process.argv.includes("--staff") || staffAccount || staffModals;
const fixtureRoot = resolve("src/app/design-preview");
assert.ok(!existsSync(fixtureRoot), "The temporary preview directory already exists; do not overwrite it");
mkdirSync(resolve(fixtureRoot, "admin/turnero"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/clientes"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/barbers"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/equipo"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/reportes"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/cierre"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/cobros"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/settings"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/galeria"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/recordatorios"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/lista-espera"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/resenas"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/fidelizacion"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "admin/cupones"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "mi-agenda"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "mi-agenda/ganancias"), { recursive: true });
mkdirSync(resolve(fixtureRoot, "mi-agenda/cuenta"), { recursive: true });
writeFileSync(resolve(fixtureRoot, "mi-agenda/ganancias/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/staff-earnings.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "mi-agenda/cuenta/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/staff-account.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "mi-agenda/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/staff.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/cupones/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/coupons.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/fidelizacion/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/loyalty.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/resenas/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/reviews.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/lista-espera/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/waitlist.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/recordatorios/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/reminders.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/galeria/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/gallery.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/settings/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/settings.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/cobros/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/payments.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/cierre/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/closing.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/reportes/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/reports.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/equipo/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/team.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/barbers/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/barbers.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/clientes/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/clients.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/home.tsx", import.meta.url)));
writeFileSync(resolve(fixtureRoot, "admin/turnero/page.tsx"), readFileSync(new URL("./fixtures/admin-shell/agenda.tsx", import.meta.url)));
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || "msedge" });
  const context = await browser.newContext({ timezoneId: "America/Argentina/Buenos_Aires" });
  let scenario = "normal";
  let releaseLoading;
  let notifyLoading;
  const loadingStarted = new Promise(resolve => { notifyLoading = resolve; });
  await context.addInitScript(() => {
    localStorage.setItem("tijerapp:onboarding-hidden:design-preview", "1");
    localStorage.setItem("tijerapp:dismissed-tips", JSON.stringify(["team-first-visit-v2", "loyalty-first-visit", "coupons-first-visit"]));
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname.endsWith(".supabase.co")) {
      if (route.request().method() !== "GET") return route.abort();
      if (reviews && url.pathname.endsWith("/appointment_reviews")) {
        if (scenario === "error") return route.fulfill({ status: 400, json: { message: "Simulated failure" } });
        return route.fulfill({ json: scenario === "empty" ? [] : [5, 3].map((rating, index) => ({ id: "review-" + index, appointment_id: "appointment-" + index, barbershop_slug: "design-preview", rating, comment: scenario === "long" ? "Comentario de demostracion con detalles sobre la atencion y el servicio recibido. ".repeat(8) : "Buena atencion y puntualidad.", created_at: "2026-10-01T12:00:00Z", appointments: { customer_name: scenario === "long" ? "Cliente de demostracion con nombre compuesto muy extenso" : "Cliente Demo " + (index + 1), customer_phone: "3515550101", service_name: "Corte", barber_name: "Alex Demo", appointment_date: "2026-09-30" } })) });
      }
      if (waitlist && url.pathname.endsWith("/waitlist_entries")) {
        if (scenario === "error") return route.fulfill({ status: 400, json: { message: "Simulated failure" } });
        return route.fulfill({ json: scenario === "empty" ? [] : ["pending", "contacted", "fulfilled"].map((status, index) => ({ id: "wait-" + index, barbershop_slug: "design-preview", barber_id: "demo-barber", service_name: "Corte", service_duration_minutes: 30, customer_name: scenario === "long" ? "Cliente de demostracion con nombre compuesto muy extenso" : "Cliente Demo " + (index + 1), customer_phone: "3515550101", preferred_date: "2026-10-02", preferred_time_from: "16:00", preferred_time_to: "19:00", notes: "Prefiere horario por la tarde", status, confirmation_token: "fixture-only" })) });
      }
      if (gallery && url.pathname.endsWith("/barbershop_gallery_photos")) {
        if (scenario === "error") return route.fulfill({ status: 400, json: { message: "Simulated failure" } });
        return route.fulfill({ json: scenario === "empty" ? [] : ["/fundadores/sv-barber.jpg", "/fundadores/leocuts.jpeg"].map((src, index) => ({ id: "photo-" + index, barbershop_slug: "design-preview", storage_path: "fixture-only", public_url: src, caption: "Foto de demostracion " + (index + 1), sort_order: index, deleted_at: null })) });
      }
      if ((team || payments || loyalty || coupons || staff) && url.pathname.endsWith("/auth/v1/user")) return route.fulfill({ json: { id: "00000000-0000-4000-8000-000000000001", email: "owner@example.test", aud: "authenticated", role: "authenticated" } });
      if (staff && url.pathname.endsWith("/barber_staff_access")) return route.fulfill({ json: scenario === "denied" ? [] : [{ barbershop_slug: "design-preview", barber_id: "demo-barber", can_see_earnings: scenario !== "restricted", can_confirm: scenario !== "restricted", can_cancel: scenario !== "restricted", can_contact_client: scenario !== "restricted", can_create_appointment: scenario !== "restricted", can_block_time: scenario !== "restricted", can_reschedule: scenario !== "restricted" }] });
      if ((barbers || reports || waitlist) && url.pathname.endsWith("/barbers")) {
        if (scenario === "error") return route.fulfill({ status: reports ? 400 : 503, json: { message: "Simulated failure" } });
        return route.fulfill({ json: scenario === "empty" ? [] : [
          { id: "demo-barber", barbershop_slug: "design-preview", name: scenario === "long" ? "Profesional con nombre compuesto muy extenso" : "Alex Demo", display_name: "Alex", role: "Barbero", whatsapp: null, is_active: true, is_owner: true, deleted_at: null, commission_percent: 50 },
          { id: "demo-barber-2", barbershop_slug: "design-preview", name: "Sam Demo", display_name: "Sam", role: "Barbero", whatsapp: null, is_active: false, is_owner: false, deleted_at: null, commission_percent: 40 },
        ] });
      }
      if (barbers && url.pathname.endsWith("/barber_services")) return route.fulfill({ json: [
        { id: "service-1", barber_id: "demo-barber", barbershop_slug: "design-preview", name: scenario === "long" ? "Corte personalizado con tratamiento y perfilado de barba" : "Corte", price: 8500, duration_minutes: 30, is_active: true, deleted_at: null },
        { id: "service-2", barber_id: "demo-barber", barbershop_slug: "design-preview", name: "Corte y barba", price: 10000, duration_minutes: 45, is_active: false, deleted_at: null },
      ] });
      if (clients && url.pathname.endsWith("/barbershop_clients")) {
        if (scenario === "error") return route.fulfill({ status: 503, json: { message: "Simulated failure" } });
        const data = scenario === "empty" ? [] : [
          { id: "client-1", name: scenario === "long" ? "Cliente de demostracion con apellido compuesto muy extenso" : "Cliente Demo", barbershop_slug: "design-preview", phone_normalized: "3515550101", phone_display: "+54 351 555 0101", tags: ["Preferencia de corte"], notes: "Prefiere corte con tijera.", created_at: "2026-09-01T12:00:00Z", deleted_at: null },
          { id: "client-2", name: "Cliente de prueba", barbershop_slug: "design-preview", phone_normalized: "3515550102", phone_display: "+54 351 555 0102", tags: [], notes: null, created_at: "2026-09-10T12:00:00Z", deleted_at: null },
        ];
        return route.fulfill({ json: data });
      }
      // Fixtures only. Never read or mutate production data during visual QA.
      if (route.request().method() !== "GET") return route.abort();
      if (url.pathname.endsWith("/appointments")) {
        if (scenario === "error") return route.fulfill({ status: reports || closing || reminders ? 400 : 503, json: { message: "Simulated failure" } });
        if (scenario === "empty") return route.fulfill({ json: [] });
        if (scenario === "loading") await new Promise(resolve => {
          releaseLoading = resolve;
          notifyLoading();
        });
      }
      const data = url.pathname.endsWith("/appointments") ? [
        { id: "demo-1", barbershop_slug: "design-preview", barber_id: "demo-barber",
          barber_name: "Alex Demo", customer_name: "Cliente Demo", customer_phone: "",
          service_name: "Corte", service_price: 8500, service_duration_minutes: 30,
          actual_duration_minutes: null, appointment_date: "2026-10-01",
          appointment_time: "18:30", status: "confirmed" },
        { id: "demo-2", barbershop_slug: "design-preview", barber_id: "demo-barber",
          barber_name: "Alex Demo", customer_name: "Cliente de prueba", customer_phone: "",
          service_name: "Corte y barba", service_price: 10000, service_duration_minutes: 30,
          appointment_date: "2026-10-01", appointment_time: "19:00", status: "pending" },
      ] : agenda && url.pathname.endsWith("/barbers") ? [
        { id: "demo-barber", barbershop_slug: "design-preview", name: "Alex Demo", display_name: null, role: null, whatsapp: null, is_active: true, deleted_at: null },
      ] : [];
      if (scenario === "long" && data.length) {
        data[0].customer_name = "Cliente de demostracion con apellido compuesto muy extenso";
        data[0].barber_name = "Profesional de demostracion con un nombre muy extenso";
        data[0].service_name = "Corte personalizado con tratamiento y perfilado de barba";
        data[0].service_price = 1234567890;
      }
      if (clients && url.pathname.endsWith("/appointments")) {
        data.forEach((row, index) => { row.customer_phone = "351555010" + (index + 1); });
      }
      if (reminders && url.pathname.endsWith("/appointments")) {
        data.push({ ...data[0], id: "demo-tomorrow", appointment_date: "2026-10-02", customer_name: "Cliente de mañana" });
        data.push({ ...data[0], id: "demo-upcoming", appointment_date: "2026-10-05", customer_name: "Cliente de la semana" });
        data.forEach((row, index) => { row.customer_phone = "351555010" + (index + 1); });
      }
      return route.fulfill({ json: data });
    }
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return route.abort();
    if (team && (url.pathname === "/api/admin/team" || url.pathname === "/api/admin/staff-access")) {
      assert.equal(route.request().method(), "GET", "Never mutate access during visual QA");
      if (scenario === "error") return route.fulfill({ status: 503, json: { error: "Simulated failure" } });
      if (url.pathname.endsWith("/team")) return route.fulfill({ json: {
        admins: scenario === "empty" ? [] : [
          { user_id: "owner", email: scenario === "long" ? "administrador.con.correo.muy.extenso@demostracion.example.test" : "owner@example.test", is_owner: true, created_at: "2026-09-01" },
          { user_id: "admin", email: "admin@example.test", is_owner: false, created_at: "2026-09-10" },
        ], max: 5, canInvite: scenario !== "member", iAmOwner: scenario !== "member",
      } });
      return route.fulfill({ json: { accesos: [{ barber_id: "demo-staff" }] } });
    }
    if (payments && url.pathname === "/api/admin/mp") {
      assert.equal(route.request().method(), "GET", "Never mutate real payment settings during visual QA");
      if (scenario === "error") return route.fulfill({ status: 400, json: { error: "Simulated failure" } });
      return route.fulfill({ json: { settings: { mp_enabled: scenario === "connected", mp_public_key: null, mp_user_id: null, deposit_percent: 30, deposit_min_amount: null, deposit_auto_cancel_hours: 24, mp_access_token_masked: null, has_access_token: scenario === "connected" } } });
    }
    if (loyalty && url.pathname === "/api/admin/loyalty") {
      assert.equal(route.request().method(), "GET", "Never change rewards during visual QA");
      if (scenario === "error") return route.fulfill({ status: 400, json: { error: "No pudimos cargar el programa." } });
      return route.fulfill({ json: {
        program: { id: "demo-program", barbershop_slug: "design-preview", is_active: true, visits_required: 10, reward_name: "Corte gratis", reward_description: "Incluye lavado y peinado." },
        customers: scenario === "empty" ? [] : [10, 7, 2].map((count, index) => ({ customer_phone: "351555010" + index, customer_name: scenario === "long" ? "Cliente de demostracion con nombre compuesto muy extenso" : "Cliente Demo " + (index + 1), active_stamps: count, total_stamps: count, last_visit_at: null, can_redeem: count >= 10 })),
      } });
    }
    if (coupons && url.pathname === "/api/admin/coupons") {
      assert.equal(route.request().method(), "GET", "Never mutate real coupons in visual QA");
      if (scenario === "error") return route.fulfill({ status: 400, json: { error: "No pudimos cargar los cupones." } });
      return route.fulfill({ json: { coupons: scenario === "empty" ? [] : ["Vigente", "Vencido", "Agotado", "Pausado"].map((state, index) => ({ id: "coupon-" + index, barbershop_slug: "design-preview", code: scenario === "long" ? "CODIGODEDEMOSTRACIONMUYLARGO2026" : ["BIENVENIDA10", "VERANO", "CLIENTES", "PROMO"][index], description: "Promocion de demostracion para clientes de la barberia", discount_type: index === 1 ? "fixed" : "percent", discount_value: index === 1 ? 1500 : 10, valid_from: null, valid_until: index === 1 ? "2026-09-01T00:00:00Z" : null, is_active: index !== 3, usage_limit: index === 2 ? 5 : null, usage_count: index === 2 ? 5 : 2 })) } });
    }
    if (staff && url.pathname.startsWith("/api/staff/")) {
      assert.equal(route.request().method(), "GET", "Never mutate staff appointments during visual QA");
      if (url.pathname.endsWith("/agenda-counts")) return route.fulfill({ json: { conteos: { "2026-10-01": 3 } } });
      if (url.pathname.endsWith("/services")) {
        if (scenario === "services-error") return route.fulfill({ status: 400, json: { error: "Simulated services error" } });
        return route.fulfill({ json: { servicios: scenario === "services-empty" ? [] : [{ id: "demo-service", name: "Corte", price: 8500, duration_minutes: 30 }] } });
      }
      if (url.pathname.endsWith("/earnings")) {
        if (scenario === "restricted") return route.fulfill({ status: 403, json: { error: "Sin permiso" } });
        if (scenario === "error") return route.fulfill({ status: 400, json: { error: "No pudimos calcular tus ganancias." } });
        return route.fulfill({ json: { periodo: { desde: url.searchParams.get("desde"), hasta: url.searchParams.get("hasta") }, turnos: scenario === "empty" ? 0 : 24, produccion: scenario === "empty" ? 0 : 204000, comisionPorcentaje: scenario === "no-commission" ? null : 50, comision: scenario === "no-commission" ? null : scenario === "empty" ? 0 : 102000 } });
      }
      if (scenario === "error") return route.fulfill({ status: 400, json: { error: "No pudimos traer tus turnos." } });
      const permitted = scenario !== "restricted";
      return route.fulfill({ json: { turnos: scenario === "empty" ? [] : ["pending", "confirmed", "cancelled"].map((status, index) => ({
        id: "staff-" + index, customer_name: scenario === "long" ? "Cliente de demostracion con nombre compuesto muy extenso" : "Cliente Demo " + (index + 1),
        customer_phone: permitted ? "3515550101" : null, service_name: "Corte", service_price: permitted ? 8500 : null, service_duration_minutes: 30, appointment_time: ["18:30", "19:00", "20:00"][index], comment: null, status,
      })), bloqueos: [], comisionDelDia: permitted ? 4250 : null, permisos: { verGanancias: permitted, confirmar: permitted, cancelar: permitted, contactarCliente: permitted, cargarTurno: permitted, bloquearHorario: permitted, reprogramar: permitted } } });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: { data: [] } });
    return route.continue();
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-10-01T18:00:00-03:00") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/design-preview/admin");
  await page.waitForLoadState("networkidle");
  if (dashboard) {
    const next = page.getByRole("region", { name: "Próximo turno" });
    await next.waitFor({ state: "visible", timeout: 3000 });
    const summary = page.getByRole("region", { name: "Resumen de hoy" });
    assert.ok((await next.boundingBox()).y < (await summary.boundingBox()).y, "Next appointment must precede mobile metrics");
    assert.ok((await next.boundingBox()).y + (await next.boundingBox()).height < 844, "Next appointment must fit first mobile viewport");
    assert.equal(await summary.locator("[data-dashboard-metric]").count(), 4);
    await page.screenshot({ path: resolve(output, "02-inicio-mobile.png"), fullPage: true, animations: "disabled" });
  }
  const opener = page.locator("header button").first();
  await page.screenshot({ path: resolve(output, baseline ? "antes-mobile.png" : "01-mobile.png"), fullPage: true });
  await opener.click();
  await page.clock.runFor(300);
  await page.screenshot({ path: resolve(output, baseline ? "antes-menu.png" : "01-menu-mobile.png"), animations: "disabled" });
  if (!baseline) {
    const dialog = page.getByRole("dialog", { name: "Navegacion principal" });
    await dialog.waitFor({ state: "visible", timeout: 3000 });
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)), "Focus escaped drawer");
    }
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.ok(await opener.evaluate(el => el === document.activeElement), "Focus not restored");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    assert.equal(await opener.getAttribute("aria-expanded"), "false");
    await opener.click();
    await page.mouse.click(380, 400);
    await dialog.waitFor({ state: "hidden" });
  } else {
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.reload();
  await page.waitForLoadState("networkidle");
  if (dashboard) {
    await page.screenshot({ path: resolve(output, "02-inicio-desktop.png"), fullPage: true, animations: "disabled" });
    const next = await page.getByRole("region", { name: "Próximo turno" }).boundingBox();
    const summary = await page.getByRole("region", { name: "Resumen de hoy" }).boundingBox();
    assert.ok(Math.abs(next.y - summary.y) < 2, "Desktop next and summary must share a row");
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Dashboard overflow at " + width);
    }
    for (const state of ["empty", "error", "long"]) {
      scenario = state;
      await page.setViewportSize({ width: 360, height: 900 });
      await page.goto(base + "/design-preview/admin?scenario=" + state);
      await page.waitForLoadState("networkidle");
      if (state === "empty") await page.getByText("No hay próximos turnos", { exact: true }).waitFor();
      if (state === "error") await page.getByRole("alert").getByText("No pudimos cargar las reservas.").waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Overflow in " + state);
      assert.ok(await page.locator("#admin-content li").evaluateAll(elements => elements.every(el => el.getBoundingClientRect().right <= innerWidth)), "Agenda row extends past viewport in " + state);
      await page.screenshot({ path: resolve(output, "02-inicio-" + state + ".png"), fullPage: true, animations: "disabled" });
    }
    scenario = "loading";
    await page.goto(base + "/design-preview/admin?scenario=loading", { waitUntil: "domcontentloaded" });
    await page.clock.runFor(200);
    await loadingStarted;
    await page.getByRole("status", { name: "Cargando resumen de hoy" }).waitFor();
    await page.screenshot({ path: resolve(output, "02-inicio-loading.png"), fullPage: true, animations: "disabled" });
    assert.equal(typeof releaseLoading, "function");
    releaseLoading();
    await page.getByRole("status", { name: "Cargando resumen de hoy" }).waitFor({ state: "hidden" });
    scenario = "normal";
    await page.setViewportSize({ width: 1440, height: 960 });
  }
  await page.screenshot({ path: resolve(output, baseline ? "antes-desktop.png" : "01-desktop.png"), fullPage: true });
  if (!baseline) {
    assert.equal(await page.locator("aside nav").getByRole("link", { name: "Inicio", exact: true }).getAttribute("aria-current"), "page");
    await page.goto(base + "/design-preview/admin/turnero");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: resolve(output, "01-pestanas-desktop.png") });
    if (agenda) {
      const region = page.getByRole("region", { name: "Agenda de turnos", exact: true });
      await region.waitFor();
      assert.ok(await region.locator("h1").evaluate(el => parseFloat(getComputedStyle(el).fontSize) <= 30), "Agenda heading is too large");
      const filters = page.getByRole("group", { name: "Filtrar turnos por estado" });
      await filters.waitFor();
      assert.equal(await filters.locator('[aria-pressed="true"]').count(), 1);
      assert.ok(await filters.locator("button").evaluateAll(els => els.every(el => el.getBoundingClientRect().height >= 44)), "Filters need touch targets");
      await page.screenshot({ path: resolve(output, "03-agenda-desktop.png"), fullPage: true, animations: "disabled" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: resolve(output, "03-agenda-mobile.png"), fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: "Pendientes", exact: false }).click();
      assert.equal(await page.getByRole("button", { name: "Pendientes", exact: false }).getAttribute("aria-pressed"), "true");
      await page.getByRole("button", { name: "Todos", exact: false }).click();
      await page.getByRole("searchbox", { name: "Buscar cliente", exact: true }).fill("Cliente Demo");
      await page.getByRole("button", { name: "Limpiar busqueda" }).click();
      await page.getByRole("button", { name: /^Dia / }).click();
      await page.getByRole("tab", { name: "Calendario", exact: true }).click();
      await page.screenshot({ path: resolve(output, "03-agenda-calendario.png"), fullPage: true, animations: "disabled" });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Calendar view overflows mobile");
      await page.getByRole("tab", { name: "Lista", exact: true }).click();
      for (const state of ["empty", "error", "long"]) {
        scenario = state;
        await page.goto(base + "/design-preview/admin/turnero?scenario=" + state);
        await page.waitForLoadState("networkidle");
        if (state === "error") await page.getByRole("alert").first().waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Agenda overflow in " + state);
        await page.screenshot({ path: resolve(output, "03-agenda-" + state + ".png"), fullPage: true, animations: "disabled" });
      }
      scenario = "normal";
      await page.goto(base + "/design-preview/admin/turnero");
      await page.waitForLoadState("networkidle");
    }
    assert.equal(await page.getByRole("navigation", { name: "Secciones de Agenda" }).getByRole("link", { name: "Turnero", exact: true }).getAttribute("aria-current"), "page");
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (staff) {
      await page.goto(base + "/design-preview/mi-agenda", { waitUntil: "networkidle" });
      await page.getByRole("region", { name: "Próximo turno", exact: true }).waitFor();
      await page.addStyleTag({ content: "nextjs-portal {display:none!important}" });
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Staff overflow at " + width);
        for (const label of ["Confirmar", "Mover", "WhatsApp"]) {
          const actions = page.getByRole(label === "WhatsApp" ? "link" : "button", { name: label, exact: true });
          assert.ok(await actions.evaluateAll(elements => elements.every(element => Array.from(element.querySelectorAll("span")).every(span => span.scrollWidth <= span.clientWidth))), "Truncated staff action " + label + " at " + width);
        }
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "17-empleado-mobile.png" : "17-empleado-desktop.png"), fullPage: true, animations: "disabled" });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok((await page.getByRole("region", { name: "Próximo turno", exact: true }).boundingBox()).y < 300, "Next appointment should lead the mobile screen");
      assert.ok(await page.getByRole("button", { name: "Confirmar", exact: true }).evaluate(el => el.getBoundingClientRect().height >= 44), "Staff actions need touch targets");
      for (const state of ["empty", "long", "error", "restricted", "denied"]) {
        scenario = state;
        await page.goto(base + "/design-preview/mi-agenda?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "denied") await page.getByRole("heading", { name: "No tenés acceso a esta barbería" }).waitFor();
        else if (state === "error") {
          await page.getByRole("alert").filter({ hasText: "No pudimos traer tus turnos." }).waitFor();
          assert.equal(await page.getByText("Hoy no tenés turnos", { exact: true }).count(), 0);
          assert.equal(await page.getByRole("region", { name: "Próximo turno", exact: true }).count(), 0);
        } else if (state === "empty") await page.getByText("Hoy no tenés turnos", { exact: true }).waitFor();
        else await page.getByRole("region", { name: "Próximo turno", exact: true }).waitFor();
        if (state === "restricted") {
          assert.equal(await page.getByRole("link", { name: "Ganancias", exact: true }).count(), 0);
          assert.equal(await page.getByRole("button", { name: "Confirmar", exact: true }).count(), 0);
          assert.equal(await page.getByRole("button", { name: "Agregar turno", exact: true }).count(), 0);
          assert.equal(await page.getByRole("link", { name: "WhatsApp", exact: true }).count(), 0);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Staff state overflow at " + state);
        await page.screenshot({ path: resolve(output, "17-empleado-" + state + ".png"), fullPage: true });
        if (state === "error") {
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar", exact: true }).click();
          await page.getByRole("region", { name: "Próximo turno", exact: true }).waitFor();
        }
      }
      scenario = "normal";
    }
    if (staffModals) {
      await page.goto(base + "/design-preview/mi-agenda", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Agregar turno", exact: true }).waitFor();
      await page.addStyleTag({ content: "nextjs-portal {display:none!important}" });
      for (const [action, title, file] of [["Agregar turno", "Agregar turno", "agregar"], ["Bloquear horario", "Bloquear horario", "bloquear"], ["Mover", "Mover turno", "mover"]]) {
        await page.getByRole("button", { name: action, exact: true }).first().click();
        const dialog = page.getByRole("dialog", { name: title, exact: true });
        await dialog.waitFor();
        assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)), "Focus must enter staff modal");
        assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
        for (const width of [360, 390, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Modal overflow " + file + " at " + width);
          assert.ok(await dialog.locator("input, select, textarea").evaluateAll(elements => elements.every(el => el.scrollWidth <= el.clientWidth + 1)), "Fields overflow " + file);
          if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, "19-" + file + (width === 390 ? "-mobile.png" : "-desktop.png")), fullPage: false });
        }
        await page.setViewportSize({ width: 390, height: 650 });
        await dialog.getByRole("button", { name: "Cerrar", exact: true }).focus();
        await page.keyboard.press("Shift+Tab");
        assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)), "Shift Tab must stay inside modal");
        if (file === "agregar") {
          await dialog.getByRole("button", { name: "Agregar turno", exact: true }).click();
          await dialog.getByRole("alert").filter({ hasText: "Elegí el servicio." }).waitFor();
          await dialog.getByLabel("Servicio", { exact: true }).selectOption("demo-service");
          await dialog.getByRole("button", { name: "Agregar turno", exact: true }).click();
          await dialog.getByRole("alert").filter({ hasText: "Poné el nombre del cliente." }).waitFor();
        } else if (file === "bloquear") {
          await dialog.getByLabel("Desde", { exact: true }).fill("19:00");
          await dialog.getByLabel("Hasta", { exact: true }).fill("18:00");
          await dialog.getByRole("button", { name: "Bloquear", exact: true }).click();
          await dialog.getByRole("alert").filter({ hasText: "El horario de fin tiene que ser posterior al de inicio." }).waitFor();
        } else {
          await dialog.getByRole("button", { name: "Mover turno", exact: true }).click();
          await dialog.getByRole("alert").filter({ hasText: "Poné el horario nuevo." }).waitFor();
        }
        assert.ok(await dialog.getByRole("button", { name: file === "agregar" ? "Agregar turno" : file === "bloquear" ? "Bloquear" : "Mover turno", exact: true }).evaluate(el => { const rect = el.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; }), "Submit must remain visible in short viewport");
        await page.screenshot({ path: resolve(output, "19-" + file + "-validacion.png"), fullPage: false });
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden");
        assert.ok(await page.getByRole("button", { name: action, exact: true }).first().evaluate(el => el === document.activeElement), "Return focus to opener");
      }
      await page.getByRole("button", { name: "2", exact: true }).click();
      await page.getByRole("button", { name: "Agregar turno", exact: true }).click();
      const add = page.getByRole("dialog", { name: "Agregar turno", exact: true });
      assert.equal(await add.getByLabel("Día", { exact: true }).inputValue(), "2026-10-02");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Bloquear horario", exact: true }).click();
      assert.equal(await page.getByRole("dialog", { name: "Bloquear horario", exact: true }).getByLabel("Día", { exact: true }).inputValue(), "2026-10-02");
      await page.keyboard.press("Escape");
      for (const state of ["services-empty", "services-error"]) {
        scenario = state;
        await page.goto(base + "/design-preview/mi-agenda?scenario=" + state, { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Agregar turno", exact: true }).click();
        const modal = page.getByRole("dialog", { name: "Agregar turno", exact: true });
        if (state === "services-empty") await modal.getByText("No tenés servicios activos para agregar un turno.", { exact: true }).waitFor();
        else await modal.getByRole("alert").filter({ hasText: "No pudimos traer tus servicios." }).waitFor();
        assert.equal(await modal.getByRole("button", { name: "Agregar turno", exact: true }).isDisabled(), true);
        await page.screenshot({ path: resolve(output, "19-agregar-" + state + ".png"), fullPage: false });
        if (state === "services-error") {
          await modal.getByLabel("Cliente", { exact: true }).fill("Cliente de prueba");
          scenario = "normal";
          await modal.getByRole("button", { name: "Reintentar servicios", exact: true }).click();
          await modal.getByLabel("Servicio", { exact: true }).selectOption("demo-service");
          assert.equal(await modal.getByLabel("Cliente", { exact: true }).inputValue(), "Cliente de prueba");
        }
        await page.keyboard.press("Escape");
      }
      scenario = "normal";
    }
    if (staffAccount) {
      await page.goto(base + "/design-preview/mi-agenda/ganancias", { waitUntil: "networkidle" });
      await page.getByText("$102.000", { exact: true }).waitFor();
      await page.addStyleTag({ content: "nextjs-portal {display:none!important}" });
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Earnings overflow at " + width);
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "18-ganancias-mobile.png" : "18-ganancias-desktop.png"), fullPage: true });
      }
      await page.getByRole("button", { name: "Mes anterior", exact: true }).click();
      await page.getByRole("heading", { name: "Septiembre de 2026", exact: true }).waitFor();
      await page.getByRole("button", { name: "Este mes", exact: true }).click();
      await page.getByRole("heading", { name: "Octubre de 2026", exact: true }).waitFor();
      for (const state of ["empty", "no-commission", "error", "restricted"]) {
        scenario = state;
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + "/design-preview/mi-agenda/ganancias?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "restricted") await page.getByRole("heading", { name: "Esta pantalla no está habilitada" }).waitFor();
        if (state === "no-commission") await page.getByText("Tu comisión todavía no está configurada.", { exact: false }).waitFor();
        if (state === "error") {
          await page.getByRole("alert").filter({ hasText: "No pudimos calcular tus ganancias." }).waitFor();
          assert.equal(await page.getByText("$102.000", { exact: true }).count(), 0);
        }
        await page.screenshot({ path: resolve(output, "18-ganancias-" + state + ".png"), fullPage: true });
        if (state === "error") {
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar", exact: true }).click();
          await page.getByText("$102.000", { exact: true }).waitFor();
        }
      }
      scenario = "normal";
      await page.goto(base + "/design-preview/mi-agenda/cuenta", { waitUntil: "networkidle" });
      await page.getByLabel("Contraseña nueva", { exact: true }).waitFor();
      await page.addStyleTag({ content: "nextjs-portal {display:none!important}" });
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Account overflow at " + width);
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "18-cuenta-mobile.png" : "18-cuenta-desktop.png"), fullPage: true });
      }
      await page.getByLabel("Contraseña nueva", { exact: true }).fill("demo-password");
      await page.getByLabel("Repetila", { exact: true }).fill("different-password");
      await page.getByRole("button", { name: "Mostrar contraseñas", exact: true }).click();
      assert.equal(await page.getByLabel("Contraseña nueva", { exact: true }).getAttribute("type"), "text");
      assert.equal(await page.getByLabel("Repetila", { exact: true }).getAttribute("type"), "text");
      await page.getByRole("button", { name: "Ocultar contraseñas", exact: true }).click();
      await page.getByRole("button", { name: "Cambiar contraseña", exact: true }).click();
      await page.getByText("Las dos contraseñas no coinciden", { exact: true }).waitFor();
    }
    if (coupons) {
      await page.goto(base + "/design-preview/admin/cupones", { waitUntil: "networkidle" });
      await page.getByText("Vigente", { exact: true }).waitFor();
      await page.addStyleTag({ content: "nextjs-portal {display:none!important}" });
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Coupons overflow at " + width);
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "16-cupones-mobile.png" : "16-cupones-desktop.png"), fullPage: true, animations: "disabled" });
      }
      for (const state of ["Vencido", "Agotado", "Pausado"]) assert.equal(await page.getByText(state, { exact: true }).count(), 1);
      await page.getByRole("button", { name: "Descuento fijo en pesos" }).click();
      assert.equal(await page.getByRole("button", { name: "Descuento fijo en pesos" }).getAttribute("aria-pressed"), "true");
      await page.getByLabel("Valor (ARS)").waitFor();
      await page.getByRole("button", { name: "Descuento porcentual" }).click();
      await page.getByLabel("Valor (%)").fill("101");
      assert.equal(await page.getByLabel("Valor (%)").evaluate(el => el.validity.rangeOverflow), true);
      await page.getByRole("textbox", { name: "Código *", exact: true }).fill("PRUEBA");
      await page.evaluate(() => { window.__copied = ""; Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.__copied = text; } } }); });
      await page.getByRole("button", { name: "Copiar código BIENVENIDA10", exact: true }).click();
      assert.equal(await page.evaluate(() => window.__copied), "BIENVENIDA10");
      await page.getByRole("button", { name: "Eliminar cupón BIENVENIDA10", exact: true }).click();
      await page.getByRole("dialog").waitFor();
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      for (const state of ["empty", "long", "error"]) {
        scenario = state;
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + "/design-preview/admin/cupones?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "error") {
          await page.getByRole("alert").first().waitFor();
          assert.equal(await page.getByText("No hay cupones creados todavía.", { exact: true }).count(), 0);
          await page.getByRole("textbox", { name: "Código *", exact: true }).fill("CONSERVAR");
        } else await page.getByRole("button", { name: "Crear cupón", exact: true }).waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Coupons state overflow");
        await page.screenshot({ path: resolve(output, "16-cupones-" + state + ".png"), fullPage: true });
        if (state === "error") {
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar", exact: true }).click();
          await page.getByText("Vigente", { exact: true }).waitFor();
          assert.equal(await page.getByRole("textbox", { name: "Código *", exact: true }).inputValue(), "CONSERVAR");
        }
      }
      scenario = "normal";
    }
    if (loyalty) {
      await page.goto(base + "/design-preview/admin/fidelizacion", { waitUntil: "networkidle" });
      await page.getByText("Premio disponible: Corte gratis", { exact: true }).waitFor();
      await page.addStyleTag({ content: "nextjs-portal {display:none!important}" });
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Loyalty overflow at " + width);
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "15-fidelizacion-mobile.png" : "15-fidelizacion-desktop.png"), fullPage: true, animations: "disabled" });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByLabel("Nombre del premio", { exact: true }).fill("Premio de prueba");
      let confirmText = "";
      page.once("dialog", async dialog => { confirmText = dialog.message(); await dialog.dismiss(); });
      await page.getByRole("button", { name: "Canjear Corte gratis" }).click();
      assert.ok(confirmText.includes("10 sellos"), "Redemption conditions must remain visible");
      for (const state of ["empty", "long", "error"]) {
        scenario = state;
        await page.goto(base + "/design-preview/admin/fidelizacion?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "error") {
          await page.getByRole("alert").first().waitFor();
          assert.equal(await page.getByText("Sin clientes con sellos todavía.", { exact: false }).count(), 0);
        } else await page.getByLabel("Nombre del premio", { exact: true }).waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Loyalty state overflow");
        await page.screenshot({ path: resolve(output, "15-fidelizacion-" + state + ".png"), fullPage: true });
        if (state === "error") {
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar", exact: true }).click();
          await page.getByText("Premio disponible: Corte gratis", { exact: true }).waitFor();
        }
      }
      scenario = "normal";
    }
    if (reviews) {
      await page.goto(base + "/design-preview/admin/resenas", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Filtrar 5 estrellas" }).waitFor();
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Reviews overflow at " + width);
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "14-resenas-mobile.png" : "14-resenas-desktop.png"), fullPage: true, animations: "disabled" });
      }
      await page.getByRole("button", { name: "Filtrar 2 estrellas" }).click();
      await page.getByText("Sin reseñas en este filtro.", { exact: true }).waitFor();
      for (const state of ["empty", "long", "error"]) {
        scenario = state;
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + "/design-preview/admin/resenas?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "error") await page.getByRole("button", { name: "Reintentar" }).waitFor();
        else await page.getByRole("status", { name: "Cargando reseñas" }).waitFor({ state: "hidden" });
        if (state === "long") {
          await page.getByRole("button", { name: "Leer completa", exact: true }).first().click();
          assert.equal(await page.getByRole("button", { name: "Ver menos", exact: true }).getAttribute("aria-expanded"), "true");
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Reviews overflow in " + state);
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        await page.screenshot({ path: resolve(output, "14-resenas-" + state + ".png"), fullPage: true });
        if (state === "error") {
          assert.equal(await page.getByText("Sin reseñas todavía", { exact: true }).count(), 0);
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar" }).click();
          await page.getByRole("button", { name: "Filtrar 5 estrellas" }).waitFor();
        }
      }
    }
    if (waitlist) {
      await page.goto(base + "/design-preview/admin/lista-espera", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Marcar contactado", exact: true }).waitFor();
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Waitlist overflow at " + width);
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "13-espera-mobile.png" : "13-espera-desktop.png"), fullPage: true, animations: "disabled" });
      }
      await page.getByRole("button", { name: "Atendidos (2)", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Reabrir", exact: true }).count(), 2);
      await page.getByRole("button", { name: "Todos (3)", exact: true }).click();
      assert.equal(await page.getByRole("link", { name: "WhatsApp", exact: true }).count(), 3);
      await page.getByRole("button", { name: "Eliminar", exact: true }).first().click();
      await page.getByRole("dialog").waitFor();
      await page.getByRole("button", { name: "Volver", exact: true }).click();
      for (const state of ["empty", "long", "error"]) {
        scenario = state;
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + "/design-preview/admin/lista-espera?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "error") await page.getByRole("button", { name: "Reintentar" }).waitFor();
        else await page.getByRole("status", { name: "Cargando lista de espera" }).waitFor({ state: "hidden" });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Waitlist overflow in " + state);
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        await page.screenshot({ path: resolve(output, "13-espera-" + state + ".png"), fullPage: true });
        if (state === "error") {
          assert.equal(await page.getByText("Sin clientes en espera", { exact: true }).count(), 0);
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar" }).click();
          await page.getByRole("button", { name: "Marcar contactado", exact: true }).waitFor();
        }
      }
    }
    if (reminders) {
      await context.addInitScript(() => localStorage.setItem("tijerapp:reminders-sent", JSON.stringify({ "demo-1:urgent": "2026-10-01T21:00:00Z" })));
      await page.goto(base + "/design-preview/admin/recordatorios", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "WhatsApp abierto", exact: true }).waitFor();
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Reminders overflow at " + width);
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "12-recordatorios-mobile.png" : "12-recordatorios-desktop.png"), fullPage: true, animations: "disabled" });
      }
      await page.getByRole("button", { name: "WhatsApp abierto", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "WhatsApp abierto", exact: true }).count(), 0);
      for (const state of ["empty", "long", "error"]) {
        scenario = state;
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + "/design-preview/admin/recordatorios?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "error") await page.getByRole("button", { name: "Reintentar" }).waitFor();
        else await page.getByRole("status", { name: "Cargando recordatorios" }).waitFor({ state: "hidden" });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Reminders overflow in " + state);
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        await page.screenshot({ path: resolve(output, "12-recordatorios-" + state + ".png"), fullPage: true });
        if (state === "error") {
          assert.equal(await page.getByText("No hay turnos en este grupo.", { exact: true }).count(), 0);
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar" }).click();
          await page.getByRole("button", { name: "WhatsApp abierto", exact: true }).waitFor();
        }
      }
    }
    if (gallery) {
      await page.goto(base + "/design-preview/admin/galeria", { waitUntil: "networkidle" });
      await page.getByLabel("Descripcion de la foto 1").waitFor();
      assert.equal(await page.getByRole("button", { name: "Mover arriba", exact: true }).first().isDisabled(), true);
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Gallery overflow at " + width);
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "11-galeria-mobile.png" : "11-galeria-desktop.png"), fullPage: true, animations: "disabled" });
      }
      await page.getByRole("button", { name: "Eliminar", exact: true }).first().click();
      await page.getByRole("dialog").waitFor();
      await page.getByRole("button", { name: "Volver", exact: true }).click();
      for (const state of ["empty", "error"]) {
        scenario = state;
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + "/design-preview/admin/galeria?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "error") await page.getByRole("button", { name: "Reintentar" }).waitFor();
        else await page.getByText("Sin fotos todavía", { exact: true }).waitFor();
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        await page.screenshot({ path: resolve(output, "11-galeria-" + state + ".png"), fullPage: true });
        if (state === "error") {
          assert.equal(await page.getByText("Sin fotos todavía", { exact: true }).count(), 0);
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar" }).click();
          await page.getByLabel("Descripcion de la foto 1").waitFor();
        }
      }
    }
    if (settings) {
      await page.goto(base + "/design-preview/admin/settings", { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Configuración", exact: true }).waitFor();
      assert.equal(await page.locator("main main").count(), 0);
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Settings overflow at " + width);
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "10-configuracion-mobile.png" : "10-configuracion-desktop.png"), fullPage: width === 1440, animations: "disabled" });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByLabel("Nombre", { exact: true }).fill("Barberia de demostracion con nombre compuesto muy extenso");
      for (const label of ["Horarios", "Reservas", "Mensajes"]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        assert.equal(await page.getByRole("button", { name: label, exact: true }).getAttribute("aria-pressed"), "true");
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Settings overflow in " + label);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.screenshot({ path: resolve(output, "10-configuracion-" + label.toLowerCase() + ".png"), fullPage: true, animations: "disabled" });
      }
      await page.getByLabel("Plantilla del mensaje de WhatsApp").fill("Hola");
      await page.getByRole("button", { name: "{nombre}", exact: true }).click();
      assert.equal(await page.getByLabel("Plantilla del mensaje de WhatsApp").inputValue(), "Hola {nombre}");
      await page.getByRole("button", { name: "Horarios", exact: true }).click();
      await page.getByLabel("Apertura", { exact: true }).fill("21:00");
      await page.getByLabel("Cierre", { exact: true }).fill("16:00");
      await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "El horario de cierre debe ser posterior" }).waitFor();
      await page.screenshot({ path: resolve(output, "10-configuracion-error.png"), fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: "Identidad", exact: true }).click();
      assert.equal(await page.getByLabel("Nombre", { exact: true }).inputValue(), "Barberia de demostracion con nombre compuesto muy extenso");
    }
    if (payments) {
      await page.goto(base + "/design-preview/admin/cobros", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Guardar cambios" }).waitFor();
      assert.equal(await page.locator("main main").count(), 0);
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Payment settings overflow at " + width);
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "09-cobros-mobile.png" : "09-cobros-desktop.png"), fullPage: true, animations: "disabled" });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "¿Preferís cargar tus credenciales a mano?" }).click();
      await page.getByLabel("Public Key", { exact: true }).fill("TEST-fixture-only");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Manual credentials overflow");
      await page.screenshot({ path: resolve(output, "09-cobros-manual.png"), fullPage: true, animations: "disabled" });
      for (const state of ["connected", "error"]) {
        scenario = state;
        await page.goto(base + "/design-preview/admin/cobros?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "error") {
          await page.getByRole("button", { name: "Reintentar" }).waitFor();
          assert.equal(await page.getByRole("button", { name: "Guardar cambios" }).count(), 0);
        } else await page.getByRole("button", { name: "Desconectar", exact: true }).waitFor();
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        await page.screenshot({ path: resolve(output, "09-cobros-" + state + ".png"), fullPage: true, animations: "disabled" });
        if (state === "error") {
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar" }).click();
          await page.getByRole("button", { name: "Guardar cambios" }).waitFor();
        }
      }
    }
    if (closing) {
      await page.goto(base + "/design-preview/admin/cierre", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "CSV", exact: true }).waitFor({ state: "visible" });
      await page.getByRole("status", { name: "Cargando resumen de caja" }).waitFor({ state: "hidden" });
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Cash summary overflow at " + width);
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "08-cierre-mobile.png" : "08-cierre-desktop.png"), fullPage: true, animations: "disabled" });
      }
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "CSV", exact: true }).click();
      assert.equal((await download).suggestedFilename(), "cierre-caja-design-preview-2026-10-01.csv");
      const pdfDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: "PDF", exact: true }).click();
      assert.equal((await pdfDownload).suggestedFilename(), "cierre-caja-design-preview-2026-10-01.pdf");
      await page.getByRole("button", { name: "Día anterior", exact: true }).click();
      assert.equal(await page.getByLabel("Fecha del resumen de caja").inputValue(), "2026-09-30");
      assert.equal(await page.getByRole("button", { name: "CSV", exact: true }).isDisabled(), true);
      await page.getByRole("button", { name: "Hoy", exact: true }).click();
      assert.equal(await page.getByLabel("Fecha del resumen de caja").inputValue(), "2026-10-01");
      for (const state of ["empty", "long", "error"]) {
        scenario = state;
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + "/design-preview/admin/cierre?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "error") {
          await page.getByRole("button", { name: "Reintentar" }).waitFor();
          assert.equal(await page.getByRole("button", { name: "CSV", exact: true }).isDisabled(), true);
          assert.equal(await page.getByText("Sin turnos este día", { exact: true }).count(), 0);
        } else await page.getByRole("status", { name: "Cargando resumen de caja" }).waitFor({ state: "hidden" });
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Cash summary overflow in " + state);
        await page.screenshot({ path: resolve(output, "08-cierre-" + state + ".png"), fullPage: true, animations: "disabled" });
        if (state === "error") {
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar" }).click();
          await page.getByRole("status", { name: "Cargando resumen de caja" }).waitFor({ state: "hidden" });
          await page.waitForLoadState("networkidle");
          await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent.trim() === "CSV" && !button.disabled));
        }
      }
    }
    if (reports) {
      await page.goto(base + "/design-preview/admin/reportes", { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Análisis y métricas" }).waitFor();
      await page.getByRole("button", { name: "Este mes", exact: true }).waitFor();
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Report overflow at " + width);
        if (width === 390 || width === 1440) await page.screenshot({ path: resolve(output, width === 390 ? "07-reportes-mobile.png" : "07-reportes-desktop.png"), fullPage: true, animations: "disabled" });
      }
      await page.getByRole("button", { name: "Hoy", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Hoy", exact: true }).getAttribute("aria-pressed"), "true");
      await page.getByLabel("Filtrar por barbero").selectOption("demo-barber-2");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: resolve(output, "07-reportes-filter-empty.png"), fullPage: true });
      for (const state of ["empty", "long", "error"]) {
        scenario = state;
        await page.goto(base + "/design-preview/admin/reportes?scenario=" + state, { waitUntil: "networkidle" });
        if (state === "error") {
          await page.getByRole("button", { name: "Reintentar" }).waitFor();
          await page.screenshot({ path: resolve(output, "07-reportes-error.png"), fullPage: true });
          scenario = "normal";
          await page.getByRole("button", { name: "Reintentar" }).click();
          await page.getByRole("button", { name: "Este mes", exact: true }).waitFor();
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Report overflow in " + state);
      }
    }
    if (team) {
      await page.goto(base + "/design-preview/admin/equipo");
      await page.waitForLoadState("networkidle");
      await page.getByRole("region", { name: "Administradores" }).waitFor({ timeout: 3000 });
      assert.ok(await page.locator("#admin-content h1").evaluate(el => parseFloat(getComputedStyle(el).fontSize) <= 30));
      assert.equal(await page.locator("main main").count(), 0);
      await page.screenshot({ path: resolve(output, "06-equipo-desktop.png"), fullPage: true, animations: "disabled" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: resolve(output, "06-equipo-mobile.png"), fullPage: true, animations: "disabled" });
      const staff = page.getByRole("region", { name: "Accesos de empleados" });
      await staff.getByRole("button", { name: "Editar", exact: true }).click();
      assert.equal(await staff.getByRole("button", { name: "Cerrar", exact: true }).getAttribute("aria-expanded"), "true");
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.clock.runFor(200);
      await page.screenshot({ path: resolve(output, "06-permisos-mobile.png"), fullPage: true, animations: "disabled" });
      await staff.getByRole("button", { name: "Cerrar", exact: true }).click();
      for (const state of ["empty", "error", "long", "member"]) {
        scenario = state;
        await page.goto(base + "/design-preview/admin/equipo?scenario=" + state);
        await page.waitForLoadState("networkidle");
        if (state === "error") {
          await page.getByRole("alert").first().waitFor();
          assert.equal(await page.getByText("Sin administradores", { exact: true }).count(), 0);
        }
        if (state === "member") assert.equal(await page.getByRole("button", { name: "Invitar", exact: true }).count(), 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Team overflow in " + state);
        await page.screenshot({ path: resolve(output, "06-equipo-" + state + ".png"), fullPage: true, animations: "disabled" });
      }
    }
    if (barbers) {
      await page.goto(base + "/design-preview/admin/barbers");
      await page.waitForLoadState("networkidle");
      const region = page.getByRole("region", { name: "Gestion de barberos" });
      await region.waitFor({ timeout: 3000 });
      assert.ok(await region.locator("h1").evaluate(el => parseFloat(getComputedStyle(el).fontSize) <= 30), "Barbers heading too large");
      await page.getByRole("button", { name: "Seleccionar Sam Demo", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Seleccionar Sam Demo", exact: true }).getAttribute("aria-pressed"), "true");
      await page.getByRole("button", { name: "Seleccionar Alex Demo", exact: true }).click();
      await page.screenshot({ path: resolve(output, "05-barberos-desktop.png"), fullPage: true, animations: "disabled" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: resolve(output, "05-barberos-mobile.png"), fullPage: true, animations: "disabled" });
      const tabs = page.getByRole("group", { name: "Secciones del barbero" });
      await tabs.getByRole("button", { name: /Servicios/ }).click();
      assert.equal(await tabs.getByRole("button", { name: /Servicios/ }).getAttribute("aria-pressed"), "true");
      await page.screenshot({ path: resolve(output, "05-servicios-mobile.png"), fullPage: true, animations: "disabled" });
      await region.getByRole("button", { name: "Agregar", exact: true }).last().click();
      await page.getByRole("textbox", { name: "Nombre del nuevo servicio" }).fill("Servicio de prueba");
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      await tabs.getByRole("button", { name: "Horarios", exact: true }).click();
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Guardar horarios", exact: true }).waitFor();
      const workingDays = page.getByRole("switch");
      assert.ok(await workingDays.evaluateAll(els => els.every(el => el.getBoundingClientRect().height >= 44)), "Day switches need touch targets");
      await page.screenshot({ path: resolve(output, "05-horarios-mobile.png"), fullPage: true, animations: "disabled" });
      for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Schedule overflow at " + width);
      }
      await page.screenshot({ path: resolve(output, "05-horarios-desktop.png"), fullPage: true, animations: "disabled" });
      await tabs.getByRole("button", { name: "Perfil", exact: true }).click();
      await page.getByRole("button", { name: "Editar", exact: true }).click();
      await page.getByRole("textbox", { name: "Nombre del barbero" }).fill("Nombre de prueba");
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      await region.getByRole("button", { name: "Agregar", exact: true }).first().click();
      await page.getByRole("dialog", { name: "Agregar barbero", exact: true }).waitFor();
      assert.ok(await page.getByRole("dialog", { name: "Agregar barbero" }).evaluate(el => el.contains(document.activeElement)), "Focus must enter add dialog");
      await page.keyboard.press("Escape");
      await page.getByRole("dialog", { name: "Agregar barbero", exact: true }).waitFor({ state: "hidden" });
      for (const state of ["empty", "error", "long"]) {
        scenario = state;
        await page.setViewportSize({ width: 360, height: 900 });
        await page.goto(base + "/design-preview/admin/barbers?scenario=" + state);
        await page.waitForLoadState("networkidle");
        if (state === "error") {
          await page.getByRole("alert").waitFor();
          assert.equal(await page.getByText("Todavia no hay barberos cargados en Supabase.", { exact: true }).count(), 0);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Barbers overflow in " + state);
        await page.screenshot({ path: resolve(output, "05-barberos-" + state + ".png"), fullPage: true, animations: "disabled" });
      }
    }
    if (clients) {
      await page.goto(base + "/design-preview/admin/clientes");
      await page.waitForLoadState("networkidle");
      const list = page.getByRole("region", { name: "Clientes", exact: true });
      await list.waitFor({ timeout: 3000 });
      assert.ok(await list.locator("h1").evaluate(el => parseFloat(getComputedStyle(el).fontSize) <= 30), "Clients heading is too large");
      await page.screenshot({ path: resolve(output, "04-clientes-desktop.png"), fullPage: true, animations: "disabled" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: resolve(output, "04-clientes-mobile.png"), fullPage: true, animations: "disabled" });
      const segments = page.getByRole("group", { name: "Filtrar clientes por segmento" });
      assert.ok(await segments.locator("button").evaluateAll(els => els.every(el => el.getBoundingClientRect().height >= 44)), "Client filters need touch targets");
      await segments.getByRole("button", { name: /^Nuevo/ }).click();
      assert.equal(await segments.getByRole("button", { name: /^Nuevo/ }).getAttribute("aria-pressed"), "true");
      await segments.getByRole("button", { name: /^Todos/ }).click();
      await page.getByRole("searchbox", { name: "Buscar clientes" }).fill("Cliente Demo");
      assert.equal(await list.getByRole("button", { name: /Cliente de prueba/ }).count(), 0, "Name search must exclude unrelated clients");
      await page.getByRole("searchbox", { name: "Buscar clientes" }).fill("Sin coincidencias");
      await page.getByText("Sin resultados", { exact: true }).waitFor({ timeout: 3000 });
      await page.getByRole("searchbox", { name: "Buscar clientes" }).fill("0101");
      assert.equal(await list.getByRole("button", { name: /Cliente Demo/ }).count(), 1);
      await list.getByRole("button", { name: /Cliente Demo/ }).click();
      await page.getByRole("heading", { name: "Ficha de cliente" }).waitFor();
      await page.screenshot({ path: resolve(output, "04-ficha-mobile.png"), fullPage: true, animations: "disabled" });
      await page.setViewportSize({ width: 1440, height: 960 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: resolve(output, "04-ficha-desktop.png"), fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: "VIP", exact: true }).click();
      await page.getByRole("button", { name: "Quitar tag VIP", exact: true }).click();
      await page.getByRole("button", { name: "Volver a clientes" }).click();
      assert.equal(await page.getByRole("searchbox", { name: "Buscar clientes" }).inputValue(), "0101");
      for (const state of ["empty", "error", "long"]) {
        scenario = state;
        await page.setViewportSize({ width: 360, height: 900 });
        await page.goto(base + "/design-preview/admin/clientes?scenario=" + state);
        await page.waitForLoadState("networkidle");
        if (state === "error") {
          await page.getByRole("alert").waitFor();
          assert.equal(await page.getByText("Sin clientes todavía", { exact: true }).count(), 0, "Errors must not look like empty data");
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Clients overflow in " + state);
        await page.screenshot({ path: resolve(output, "04-clientes-" + state + ".png"), fullPage: true, animations: "disabled" });
        if (state === "long") {
          await page.getByRole("button", { name: /Cliente de demostracion/ }).click();
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
          await page.clock.runFor(1000);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Long client detail overflows");
          await page.screenshot({ path: resolve(output, "04-ficha-long.png"), fullPage: true, animations: "disabled" });
          await page.getByRole("button", { name: "Volver a clientes" }).click();
        }
      }
      scenario = "loading";
      await page.goto(base + "/design-preview/admin/clientes?scenario=loading", { waitUntil: "domcontentloaded" });
      await loadingStarted;
      await page.getByRole("status", { name: "Cargando clientes" }).waitFor();
      await page.screenshot({ path: resolve(output, "04-clientes-loading.png"), fullPage: true, animations: "disabled" });
      releaseLoading();
      await page.getByRole("status", { name: "Cargando clientes" }).waitFor({ state: "hidden" });
      scenario = "normal";
    }
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Horizontal overflow at " + width);
    }
  }
  console.log(baseline ? "Baseline captured" : "PASS: drawer focus, Escape, backdrop, focus restoration, active navigation, widths and screenshots");
} finally {
  await browser?.close();
  unlinkSync(resolve(fixtureRoot, "mi-agenda/ganancias/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "mi-agenda/ganancias"));
  unlinkSync(resolve(fixtureRoot, "mi-agenda/cuenta/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "mi-agenda/cuenta"));
  unlinkSync(resolve(fixtureRoot, "mi-agenda/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "mi-agenda"));
  unlinkSync(resolve(fixtureRoot, "admin/cupones/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/cupones"));
  unlinkSync(resolve(fixtureRoot, "admin/fidelizacion/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/fidelizacion"));
  unlinkSync(resolve(fixtureRoot, "admin/resenas/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/resenas"));
  unlinkSync(resolve(fixtureRoot, "admin/lista-espera/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/lista-espera"));
  unlinkSync(resolve(fixtureRoot, "admin/recordatorios/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/recordatorios"));
  unlinkSync(resolve(fixtureRoot, "admin/galeria/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/galeria"));
  unlinkSync(resolve(fixtureRoot, "admin/settings/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/settings"));
  unlinkSync(resolve(fixtureRoot, "admin/cobros/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/cobros"));
  unlinkSync(resolve(fixtureRoot, "admin/cierre/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/cierre"));
  unlinkSync(resolve(fixtureRoot, "admin/reportes/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/reportes"));
  unlinkSync(resolve(fixtureRoot, "admin/turnero/page.tsx"));
  unlinkSync(resolve(fixtureRoot, "admin/clientes/page.tsx"));
  unlinkSync(resolve(fixtureRoot, "admin/barbers/page.tsx"));
  unlinkSync(resolve(fixtureRoot, "admin/equipo/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/equipo"));
  rmdirSync(resolve(fixtureRoot, "admin/barbers"));
  rmdirSync(resolve(fixtureRoot, "admin/clientes"));
  unlinkSync(resolve(fixtureRoot, "admin/page.tsx"));
  rmdirSync(resolve(fixtureRoot, "admin/turnero"));
  rmdirSync(resolve(fixtureRoot, "admin"));
  rmdirSync(fixtureRoot);
}
