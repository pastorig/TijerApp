// Mide el lag del panel en un celular FLOJO simulado (feature 045): CPU frenada
// con CDP, 390 px, dueño descartable de la demo primebarber (se borra al final).
//
//   node --env-file=.env.local scripts/qa-rendimiento.mjs [--cpu=6] [--base=http://localhost:3020] [--rutas=a,b] [--staff]
//
// Por ruta: tareas largas al cargar (TBT), y durante 4 s de scroll: cuadros por
// segundo y % de cuadros trabados (> 50 ms). También abre y cierra el ＋.
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const { chromium } = await import("file:///C:/Users/Pastori/OneDrive/Desktop/Bautista/OdontoApp/odonto-next/node_modules/playwright/index.mjs");
const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=").slice(1).join("=");
const base = opt("base", "http://localhost:3020");
const cpu = Number(opt("cpu", "6"));
const comoEmpleado = args.includes("--staff");
const rutas = opt("rutas", comoEmpleado ? "mi-agenda" : ",turnero,clientes,reportes").split(",");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `qa-celular-${Date.now()}@example.com`;
const clave = crypto.randomBytes(12).toString("base64url");
const { data: creado, error } = await admin.auth.admin.createUser({ email, password: clave, email_confirm: true });
if (error) throw error;
const userId = creado.user.id;

// Se instala antes de que cargue cada página: junta las tareas largas.
const SONDA = `
  window.__largas = [];
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__largas.push(e.duration); })
      .observe({ type: "longtask", buffered: true });
  } catch {}
`;

async function medirScroll(page, ms = 4000) {
  return page.evaluate(async (ms) => {
    const el = document.querySelector(".tj-panel-scroll") ?? document.scrollingElement;
    const tiempos = [];
    let ultimo = performance.now();
    const fin = ultimo + ms;
    let dir = 1;
    await new Promise((listo) => {
      function cuadro(t) {
        tiempos.push(t - ultimo);
        ultimo = t;
        const max = el.scrollHeight - el.clientHeight;
        if (el.scrollTop >= max - 2) dir = -1;
        if (el.scrollTop <= 0) dir = 1;
        el.scrollTop += dir * 18;
        if (t < fin) requestAnimationFrame(cuadro);
        else listo();
      }
      requestAnimationFrame(cuadro);
    });
    const total = tiempos.reduce((a, b) => a + b, 0);
    return {
      fps: Math.round((tiempos.length / total) * 1000),
      trabados: Math.round((tiempos.filter((t) => t > 50).length / tiempos.length) * 100),
      peorMs: Math.round(Math.max(...tiempos)),
    };
  }, ms);
}

const filas = [];
try {
  const { error: e1 } = comoEmpleado
    ? await admin.from("barber_staff_access").insert({
        user_id: userId, granted_by: userId, barbershop_slug: "primebarber", barber_id: "a583cb34-f499-4bd0-be40-d0ae8688b2c1",
        can_see_earnings: true, can_confirm: true, can_cancel: true, can_contact_client: true,
        can_create_appointment: true, can_block_time: true, can_reschedule: true,
      })
    : await admin.from("barbershop_admins").insert({ user_id: userId, barbershop_slug: "primebarber", role: "admin" });
  if (e1) throw e1;

  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires" });
  await ctx.addInitScript(SONDA);
  const page = await ctx.newPage();
  await page.goto(`${base}/primebarber/admin/login`, { waitUntil: "load", timeout: 120000 });
  await page.fill("#admin-email", email);
  await page.fill("#admin-password", clave);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === (comoEmpleado ? "/primebarber/mi-agenda" : "/primebarber/admin"), { timeout: 60000 });

  // Calentar (que el servidor de desarrollo compile) sin freno.
  for (const r of rutas) await page.goto(`${base}/primebarber/${comoEmpleado ? "" : "admin/"}${r}`, { waitUntil: "load", timeout: 120000 });

  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  for (const r of rutas) {
    const t0 = Date.now();
    await page.goto(`${base}/primebarber/${comoEmpleado ? "" : "admin/"}${r}`, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(4000);
    const carga = Date.now() - t0;
    const largas = await page.evaluate(() => window.__largas ?? []);
    const tbt = Math.round(largas.reduce((a, d) => a + Math.max(0, d - 50), 0));
    const clase = await page.evaluate(() => document.documentElement.className);
    // El Turnero con "Todos": la lista más larga del panel.
    let todosMs = null;
    if (r === "turnero") {
      todosMs = await page.evaluate(async () => {
        const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith("Todos"));
        if (!b) return null;
        const t = performance.now();
        b.click();
        await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
        return Math.round(performance.now() - t);
      });
      await page.waitForTimeout(1500);
    }
    const { nodos, desenfocados } = await page.evaluate(() => {
      let d = 0;
      for (const e of document.querySelectorAll("*")) {
        const f = getComputedStyle(e).backdropFilter;
        if (f && f !== "none") d++;
      }
      return { nodos: document.querySelectorAll("*").length, desenfocados: d };
    });
    const s = await medirScroll(page);
    let mas = null;
    const boton = page.locator(comoEmpleado ? "button[aria-label='Agregar turno']" : "button[aria-label='Turno nuevo']").first();
    if (await boton.isVisible().catch(() => false)) {
      const a = Date.now();
      await boton.click();
      await page.locator(".tj-ventana--abierta").first().waitFor({ timeout: 15000 }).catch(() => {});
      mas = Date.now() - a;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
    }
    filas.push({
      ruta: r || "inicio", tbtMs: tbt, nodos, desenfocados, todosMs,
      fps: s.fps, trabadosPct: s.trabados, peorCuadroMs: s.peorMs, abrirMasMs: mas,
      nivel: /tj-muy-lento/.test(clase) ? 2 : /tj-lento/.test(clase) ? 1 : 0,
    });
    void carga;
  }
  await browser.close();
} finally {
  await admin.from("barbershop_admins").delete().eq("user_id", userId);
  await admin.from("barber_staff_access").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}
console.log(`CPU ${cpu}x más lenta`);
console.table(filas);
