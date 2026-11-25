// QA de las páginas del CLIENTE en el celular (feature 041, tanda 6), con la
// demo primebarber. Crea un turno de prueba para ver el link del turno y lo
// borra al final. No reserva nada de verdad.
//
//   node --env-file=.env.local scripts/qa-publico.mjs <carpeta> [--base=http://localhost:3020] [--compu]
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const { chromium } = await import("file:///C:/Users/Pastori/OneDrive/Desktop/Bautista/OdontoApp/odonto-next/node_modules/playwright/index.mjs");
const args = process.argv.slice(2);
const carpeta = args.find((a) => !a.startsWith("--"));
const base = (args.find((a) => a.startsWith("--base=")) ?? "--base=http://localhost:3020").slice(7);
const compu = args.includes("--compu");
fs.mkdirSync(carpeta, { recursive: true });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const manana = new Date(Date.now() - 3 * 3600e3 + 2 * 86400e3).toISOString().slice(0, 10);
const { data: turno, error } = await s.from("appointments").insert({
  barbershop_slug: "primebarber", barber_id: "b7996059-cf06-4f8a-a53d-68909618707c", barber_name: "Esteban",
  customer_name: "Prueba Vidrio", customer_phone: "+54 9 351 600-9944", service_name: "Corte", service_price: 12000,
  service_duration_minutes: 30, appointment_date: manana, appointment_time: "17:00:00", comment: "", status: "confirmed",
}).select("id, confirmation_token").single();
if (error) throw error;

const tapados = (page) => page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("button, a, input, select, textarea")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.pointerEvents === "none" || el.closest("[inert], [aria-hidden='true']")) continue;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!top || el.contains(top) || top.closest("nextjs-portal")) continue;
    out.push((el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 28));
  }
  return [...new Set(out)];
});
const desborde = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

try {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({
    viewport: compu ? { width: 1280, height: 860 } : { width: 390, height: 844 },
    deviceScaleFactor: compu ? 1 : 2, isMobile: !compu, hasTouch: !compu, locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires",
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(`${new URL(page.url()).pathname}: ${e.message.slice(0, 160)}`));
  const foto = async (nombre) => {
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
    await page.screenshot({ path: `${carpeta}/${nombre}.png` });
    console.log(`${nombre}: tapados ${JSON.stringify(await tapados(page))} · desborde ${await desborde(page)}px`);
  };
  const ir = async (ruta) => { await page.goto(base + ruta, { waitUntil: "networkidle" }); await page.waitForTimeout(2500); };

  await ir("/primebarber"); await foto("landing");
  await page.evaluate(() => window.scrollTo(0, 1400)); await page.waitForTimeout(800); await foto("landing-abajo");

  await ir("/primebarber/reservar"); await foto("reservar");
  const barbero = page.locator("button:visible").filter({ hasText: /Esteban/ }).first();
  if (await barbero.count()) { await barbero.tap().catch(() => barbero.click()); await page.waitForTimeout(1500); }
  const servicio = page.locator("button:visible").filter({ hasText: /\$\s?\d/ }).first();
  if (await servicio.count()) { await servicio.tap().catch(() => servicio.click()); await page.waitForTimeout(1500); }
  await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(800); await foto("reservar-dias");
  const dia = page.locator("button:visible").filter({ hasText: /^(MAÑ|JUE|VIE|SÁB|LUN|MAR|MIÉ)/ }).nth(1);
  if (await dia.count()) { await dia.tap().catch(() => dia.click()); await page.waitForTimeout(2000); }
  await page.evaluate(() => window.scrollTo(0, 1500)); await page.waitForTimeout(800); await foto("reservar-horarios");
  await page.evaluate(() => window.scrollTo(0, 99999)); await page.waitForTimeout(800); await foto("reservar-datos");

  await ir(`/r/${turno.confirmation_token}`); await foto("turno");
  await ir(`/r/${turno.confirmation_token}/responder`); await foto("responder");
  const reagendar = page.getByRole("button", { name: /Reagendar|Cambiar/ }).first();
  if (await reagendar.count()) { await reagendar.click(); await page.waitForTimeout(1500); await foto("responder-reagendar"); }

  // Reseña y lista de espera con un link que no existe: el estado de error.
  await ir("/rev/no-existe"); await foto("resena-invalida");
  await ir("/w/no-existe"); await foto("espera-invalida");

  console.log("errores:", errores.length ? errores : "ninguno");
  await browser.close();
} finally {
  await s.from("appointments").delete().eq("id", turno.id);
  console.log("turno de prueba borrado");
}
