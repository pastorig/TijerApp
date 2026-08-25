/**
 * Tests del agrupado de la agenda del empleado en mañana y tarde.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-staff-agenda-grouping.ts
 */
import {
  agruparPorFranja,
  esDeManana,
  minutosDelTurno,
} from "../src/lib/staff-agenda-grouping.ts";

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

const t = (appointment_time: string) => ({ appointment_time });

// ── El corte ────────────────────────────────────────────────────────────────
check("las 9 son mañana", esDeManana("09:00"), true);
check("las 12:30 siguen siendo mañana", esDeManana("12:30"), true);
check("las 12:59 también", esDeManana("12:59"), true);
check("las 13:00 ya son tarde", esDeManana("13:00"), false);
check("las 20:00 son tarde", esDeManana("20:00"), false);

// Los horarios vienen de la base como "09:00:00": no se puede asumir "HH:MM".
check("acepta el formato con segundos", minutosDelTurno("09:30:00"), 570);
check("un horario roto no explota", minutosDelTurno("no soy hora"), 0);

// ── Cuándo se agrupa ────────────────────────────────────────────────────────
{
  const r = agruparPorFranja([t("09:00"), t("11:00"), t("16:20")]);
  check("con turnos en las dos mitades, agrupa", r.agrupar, true);
  if (r.agrupar) {
    check("dos a la mañana", r.manana.length, 2);
    check("uno a la tarde", r.tarde.length, 1);
  }
}

// La regla que motivó separar esto: un solo encabezado arriba de toda la lista
// no ordena nada, es ruido.
{
  const r = agruparPorFranja([t("15:00"), t("16:00"), t("17:00")]);
  check("todos a la tarde → NO agrupa", r.agrupar, false);
  if (!r.agrupar) check("y devuelve la lista entera", r.turnos.length, 3);
}
{
  const r = agruparPorFranja([t("09:00"), t("10:00")]);
  check("todos a la mañana → NO agrupa", r.agrupar, false);
}
{
  const r = agruparPorFranja([]);
  check("sin turnos → NO agrupa", r.agrupar, false);
  if (!r.agrupar) check("y la lista viene vacía", r.turnos.length, 0);
}
{
  const r = agruparPorFranja([t("12:59"), t("13:00")]);
  check("un turno de cada lado del corte ya agrupa", r.agrupar, true);
}

// ── No se pierde ni se duplica ningún turno ─────────────────────────────────
{
  const lista = [t("08:00"), t("12:00"), t("13:30"), t("19:45")];
  const r = agruparPorFranja(lista);
  const total = r.agrupar ? r.manana.length + r.tarde.length : r.turnos.length;
  check("la suma de las franjas da el total", total, lista.length);
}

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
