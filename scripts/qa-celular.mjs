// QA del celular (feature 041): entra con un dueño DESCARTABLE de la demo
// primebarber, saca capturas a 390 px de las rutas pedidas y lo borra al final.
//
//   node --env-file=.env.local scripts/qa-celular.mjs <carpeta> <ruta> [<ruta>...] [--webkit] [--base=http://localhost:3000]
//
// Una ruta puede llevar acciones después de "|": "turnero|click:button[aria-label='Turno nuevo']|wait:1500|shot:nuevo"
// NUNCA contra barberías reales: el usuario se crea solo para primebarber.
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";

const PW = "file:///C:/Users/Pastori/OneDrive/Desktop/Bautista/OdontoApp/odonto-next/node_modules/playwright/index.mjs";
const { chromium, webkit } = await import(PW);
const args = process.argv.slice(2);
const carpeta = args.find((a) => !a.startsWith("--"));
// "@archivo" = una ruta con sus acciones por línea (evita pelear con las
// comillas de la consola).
const rutas = args
  .filter((a) => !a.startsWith("--"))
  .slice(1)
  .flatMap((a) => (a.startsWith("@") ? fs.readFileSync(a.slice(1), "utf8").split(/\r?\n/).filter(Boolean) : [a]));
const base = (args.find((a) => a.startsWith("--base=")) ?? "--base=http://localhost:3000").slice(7);
const usarWebkit = args.includes("--webkit");
fs.mkdirSync(carpeta, { recursive: true });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `qa-celular-${Date.now()}@example.com`;
const clave = crypto.randomBytes(12).toString("base64url");
const { data: creado, error } = await admin.auth.admin.createUser({ email, password: clave, email_confirm: true });
if (error) throw error;
const userId = creado.user.id;

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

// --staff: entra como EMPLEADO de la demo (barbero Esteban, todos los
// permisos) y las rutas cuelgan de /primebarber/ (ej. "mi-agenda").
const comoEmpleado = args.includes("--staff");
try {
  const { error: e1 } = comoEmpleado
    ? await admin.from("barber_staff_access").insert({
        // Matías: Esteban ya tiene un empleado asignado en la demo.
        user_id: userId, granted_by: userId, barbershop_slug: "primebarber", barber_id: "a583cb34-f499-4bd0-be40-d0ae8688b2c1",
        can_see_earnings: true, can_confirm: true, can_cancel: true, can_contact_client: true,
        can_create_appointment: true, can_block_time: true, can_reschedule: true,
      })
    : await admin.from("barbershop_admins").insert({ user_id: userId, barbershop_slug: "primebarber", role: "admin" });
  if (e1) throw e1;
  const motor = usarWebkit ? webkit : chromium;
  const browser = await motor.launch(usarWebkit ? {} : { channel: "chrome" });
  // --compu: a 1280 px, para confirmar que la compu no cambió.
  const compu = args.includes("--compu");
  const ctx = await browser.newContext({ viewport: compu ? { width: 1280, height: 860 } : { width: 390, height: 844 }, deviceScaleFactor: compu ? 1 : 2, isMobile: !usarWebkit && !compu, hasTouch: !compu, locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.goto(`${base}/primebarber/admin/login`, { waitUntil: "networkidle" });
  await page.fill("#admin-email", email);
  await page.fill("#admin-password", clave);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname === (comoEmpleado ? "/primebarber/mi-agenda" : "/primebarber/admin"), { timeout: 40000 });
  for (const ruta of rutas) {
    const [camino, ...acciones] = ruta.split("|");
    const nombre = camino.replace(/[^a-z0-9]+/gi, "-") || "inicio";
    await page.goto(`${base}/primebarber/${comoEmpleado ? "" : "admin/"}${camino}`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${carpeta}/${nombre}.png` });
    console.log(`${nombre}: tapados ${JSON.stringify(await tapados(page))}`);
    for (const accion of acciones) {
      const [tipo, ...resto] = accion.split(":");
      const valor = resto.join(":");
      // Un paso que falla no corta el resto: se anota y sigue.
      if (tipo === "click" && !(await page.locator(valor).first().isVisible().catch(() => false))) {
        console.log(`${nombre}: no está visible ${valor} (se saltea)`);
        continue;
      }
      if (tipo === "fill") {
        const [sel, texto] = valor.split("@");
        await page.locator(sel).first().fill(texto);
      } else if (tipo === "click") await page.click(valor);
      else if (tipo === "tap") await page.tap(valor);
      else if (tipo === "wait") await page.waitForTimeout(Number(valor));
      else if (tipo === "scroll") await page.evaluate((y) => document.querySelector(".tj-panel-scroll")?.scrollTo(0, Number(y)), valor);
      else if (tipo === "drag") {
        const [sel, dy] = valor.split("@");
        const box = await page.locator(sel).first().boundingBox();
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        await page.mouse.move(x, y); await page.mouse.down();
        for (let i = 1; i <= 10; i++) await page.mouse.move(x, y + (Number(dy) * i) / 10);
        await page.mouse.up();
      } else if (tipo === "shot") {
        await page.screenshot({ path: `${carpeta}/${nombre}-${valor}.png` });
        console.log(`${nombre}-${valor}: tapados ${JSON.stringify(await tapados(page))}`);
      } else if (tipo === "eval") console.log(`${nombre} eval:`, await page.evaluate(valor));
    }
  }
  console.log("errores:", errores.length ? errores : "ninguno");
  await browser.close();
} finally {
  await admin.from("barbershop_admins").delete().eq("user_id", userId);
  await admin.from("barber_staff_access").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
  console.log("cuenta de prueba borrada");
}
