/**
 * Tests del aviso de vencimiento del plan (lógica pura, sin base).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-plan-notices.ts
 */
import {
  daysUntil,
  planNoticeDue,
  planNoticeMessage,
} from "../src/lib/plan-notices.ts";

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

const HOY = "2026-08-19";
/** Un vencimiento a las 12 del mediodía argentino de ese día. */
const vence = (ymd: string) => `${ymd}T15:00:00.000Z`;

// ── La ventana ───────────────────────────────────────────────────────────────
check("faltan 5 días → todavía no se avisa", planNoticeDue({ periodEndsAt: vence("2026-08-24"), todayYmd: HOY }), null);
check("faltan 4 días → todavía no se avisa", planNoticeDue({ periodEndsAt: vence("2026-08-23"), todayYmd: HOY }), null);
check("faltan 3 días → primer aviso", planNoticeDue({ periodEndsAt: vence("2026-08-22"), todayYmd: HOY }), "vence_3d");

// El caso que motivó que la ventana sea "3 o menos": una barbería que ya está
// adentro cuando la feature se activa igual tiene que recibir el primer aviso.
check("faltan 2 días → primer aviso igual", planNoticeDue({ periodEndsAt: vence("2026-08-21"), todayYmd: HOY }), "vence_3d");
check("falta 1 día → primer aviso igual", planNoticeDue({ periodEndsAt: vence("2026-08-20"), todayYmd: HOY }), "vence_3d");

check("vence hoy → aviso del día", planNoticeDue({ periodEndsAt: vence(HOY), todayYmd: HOY }), "vence_hoy");

// ── Fuera de alcance ─────────────────────────────────────────────────────────
check("venció ayer → nada (de eso se ocupa el modo lectura)", planNoticeDue({ periodEndsAt: vence("2026-08-18"), todayYmd: HOY }), null);
check("venció hace un mes → nada", planNoticeDue({ periodEndsAt: vence("2026-07-19"), todayYmd: HOY }), null);
check("nunca pagó (null) → nada", planNoticeDue({ periodEndsAt: null, todayYmd: HOY }), null);
check("vencimiento vacío → nada", planNoticeDue({ periodEndsAt: undefined, todayYmd: HOY }), null);
check("fecha inválida → nada, no explota", planNoticeDue({ periodEndsAt: "no soy una fecha", todayYmd: HOY }), null);

// ── El día es calendario, no milisegundos ────────────────────────────────────
// Dos momentos del MISMO día argentino tienen que dar el mismo resultado, sin
// importar la hora. 03:00Z de un día es todavía el día anterior en Argentina.
check(
  "vence hoy a las 23:50 ART → sigue siendo hoy",
  planNoticeDue({ periodEndsAt: "2026-08-20T02:50:00.000Z", todayYmd: HOY }),
  "vence_hoy",
);
check(
  "vence hoy a las 00:10 ART → sigue siendo hoy",
  planNoticeDue({ periodEndsAt: "2026-08-19T03:10:00.000Z", todayYmd: HOY }),
  "vence_hoy",
);
check(
  "un instante después de medianoche ART ya es mañana",
  planNoticeDue({ periodEndsAt: "2026-08-20T03:10:00.000Z", todayYmd: HOY }),
  "vence_3d",
);

// ── Días restantes ───────────────────────────────────────────────────────────
check("días restantes: 3", daysUntil(vence("2026-08-22"), HOY), 3);
check("días restantes: 0 el día que vence", daysUntil(vence(HOY), HOY), 0);

// ── Textos ───────────────────────────────────────────────────────────────────
check("el título dice cuántos días faltan", planNoticeMessage("vence_3d", 3).title, "Tu plan vence en 3 días");
check("un solo día va en singular", planNoticeMessage("vence_3d", 1).title, "Tu plan vence en 1 día");
check("el día del vencimiento cambia el título", planNoticeMessage("vence_hoy", 0).title, "Tu plan vence hoy");

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
