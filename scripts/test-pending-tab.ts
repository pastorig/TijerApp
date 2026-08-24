/**
 * Tests de la pestaña que se abre en el click y se navega después.
 *
 * Lo que fijan: que la pestaña se pida EN EL MOMENTO, no cuando llega la
 * respuesta. Ese es todo el punto — un `window.open` después de un `await` lo
 * bloquea el navegador, y el cliente se queda sin WhatsApp.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-pending-tab.ts
 */
import { openPendingTab } from "../src/lib/pending-tab.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(
    `${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`,
  );
  if (ok) passed++;
  else failed++;
}

type FakeTab = {
  closed: boolean;
  opener: unknown;
  location: { href: string; replace: (url: string) => void };
  document: {
    title: string;
    body: { setAttribute: () => void; appendChild: () => void };
    createElement: () => { textContent: string; setAttribute: () => void };
  };
  close: () => void;
};

function fakeTab(): FakeTab {
  const tab: FakeTab = {
    closed: false,
    opener: {},
    location: {
      href: "",
      replace(url: string) {
        tab.location.href = url;
      },
    },
    document: {
      title: "",
      body: { setAttribute: () => {}, appendChild: () => {} },
      createElement: () => ({ textContent: "", setAttribute: () => {} }),
    },
    close() {
      tab.closed = true;
    },
  };
  return tab;
}

/** Instala un window falso y devuelve el registro de lo que se le pidió. */
function installWindow(tabFactory: () => FakeTab | null) {
  const aperturas: Array<{ url: string; target: string }> = [];
  let ultima: FakeTab | null = null;
  const timers = new Map<number, () => void>();
  let nextTimer = 1;

  (globalThis as { window?: unknown }).window = {
    open(url: string, target: string) {
      aperturas.push({ url, target });
      ultima = tabFactory();
      return ultima;
    },
    setTimeout(fn: () => void) {
      const id = nextTimer++;
      timers.set(id, fn);
      return id;
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
  };

  return {
    aperturas,
    tab: () => ultima,
    /** Dispara el cierre automático, como si hubieran pasado los 20 segundos. */
    correrTimers: () => timers.forEach((fn) => fn()),
  };
}

// ── Se abre en el momento, no después ───────────────────────────────────────
{
  const w = installWindow(fakeTab);
  openPendingTab();
  check("pide la pestaña apenas se la llama", w.aperturas.length, 1);
  check("la pide en blanco", w.aperturas[0]?.url, "");
  check("la pide en una pestaña nueva", w.aperturas[0]?.target, "_blank");
}

// ── go() navega LA MISMA pestaña ────────────────────────────────────────────
{
  const w = installWindow(fakeTab);
  const pending = openPendingTab();
  pending.go("https://wa.me/549351234?text=hola");
  check(
    "navega la pestaña que ya estaba abierta",
    w.tab()?.location.href,
    "https://wa.me/549351234?text=hola",
  );
  check("no abre una segunda pestaña", w.aperturas.length, 1);
  check("corta el vínculo con la pestaña original", w.tab()?.opener, null);
  check("no la cierra", w.tab()?.closed, false);
}

// ── cancel() cierra la que no se usó ────────────────────────────────────────
{
  const w = installWindow(fakeTab);
  const pending = openPendingTab();
  pending.cancel();
  check("una reserva que falla no deja la pestaña colgada", w.tab()?.closed, true);
}

// ── El cierre automático es la red de seguridad ─────────────────────────────
{
  const w = installWindow(fakeTab);
  openPendingTab();
  w.correrTimers();
  check("si nadie la usa, se cierra sola", w.tab()?.closed, true);
}
{
  const w = installWindow(fakeTab);
  const pending = openPendingTab();
  pending.go("https://wa.me/1");
  w.correrTimers();
  check("pero NO cierra una que ya se usó", w.tab()?.closed, false);
}

// ── Si el navegador no dejó abrirla, igual se intenta ───────────────────────
{
  const w = installWindow(() => null);
  const pending = openPendingTab();
  pending.go("https://wa.me/549351234");
  check("reintenta con la URL final", w.aperturas.length, 2);
  check("y esa segunda va a WhatsApp", w.aperturas[1]?.url, "https://wa.me/549351234");
}

// ── cancel() de más no rompe nada ───────────────────────────────────────────
{
  const w = installWindow(fakeTab);
  const pending = openPendingTab();
  pending.go("https://wa.me/1");
  pending.cancel();
  check("cancel() después de go() no cierra WhatsApp", w.tab()?.closed, false);
}

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
