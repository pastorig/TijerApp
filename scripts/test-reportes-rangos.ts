/**
 * Tests de los rangos de Reportes.
 *
 * Existe por un reporte de SV Barber: al sexto día de septiembre, "este mes"
 * le mostraba 59 turnos y "esta semana" 47, y no entendía por qué dos números
 * que deberían contar lo mismo no coincidían. La diferencia eran 12 turnos ya
 * reservados para más adelante: el rango del mes iba del 1 al 30 COMPLETO, con
 * los días que todavía no habían pasado adentro.
 *
 * De paso salían dos números más que mentían:
 *  · el promedio por día dividía por los 30 días del mes en vez de por los 6
 *    transcurridos, así que mostraba 1,97 cuando venía a casi 8 por día;
 *  · el "vs anterior" comparaba seis días de septiembre contra los treinta y
 *    uno de agosto enteros, o sea una caída inventada.
 *
 * Correr: node --experimental-strip-types scripts/test-reportes-rangos.ts
 */
import { rangoAnterior, rangoDelPeriodo } from "../src/lib/report-ranges.ts";

let passed = 0;
let failed = 0;

function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

// ─── El caso exacto de SV Barber: domingo 6 de septiembre de 2026 ────────────
const domingo6 = new Date(2026, 8, 6);

const mes = rangoDelPeriodo("month", domingo6);
check("el mes corta hoy, no el 30", mes.end, "2026-09-06");
check("y cuenta los días transcurridos", mes.days, 6);

const semana = rangoDelPeriodo("week", domingo6);
check("la semana arranca el lunes", semana.start, "2026-08-31");
check("y también corta hoy", semana.end, "2026-09-06");
check("son 7 días", semana.days, 7);

// Que los dos terminen el mismo día es lo que hace que los números cierren
// entre sí. La semana sigue teniendo un día más —el 31 de agosto—, pero eso
// ahora se explica mirando la pantalla.
check("los dos terminan hoy", mes.end === semana.end, true);

// ─── La comparación contra el período anterior ──────────────────────────────
const mesAnterior = rangoAnterior("month", mes.days, domingo6);
check("el mes anterior arranca el 1", mesAnterior.start, "2026-08-01");
check("y toma los mismos 6 días, no el mes entero", mesAnterior.end, "2026-08-06");
check("mismo largo que el actual", mesAnterior.days, mes.days);

const semanaAnterior = rangoAnterior("week", semana.days, domingo6);
check("la semana anterior es la de antes", semanaAnterior.start, "2026-08-24");
check("hasta su domingo", semanaAnterior.end, "2026-08-30");

check("ayer es el período anterior de hoy", rangoAnterior("today", 1, domingo6).start, "2026-09-05");

// ─── El mes anterior más corto ──────────────────────────────────────────────
// 31 de marzo: el mes lleva 31 días y febrero no llega. No puede pisar marzo.
const marzo31 = new Date(2026, 2, 31);
const marzo = rangoDelPeriodo("month", marzo31);
check("marzo hasta el 31 son 31 días", marzo.days, 31);
const febrero = rangoAnterior("month", marzo.days, marzo31);
check("febrero se recorta a su último día", febrero.end, "2026-02-28");
check("y el largo baja a 28", febrero.days, 28);

// ─── El promedio ya no divide por días que no pasaron ───────────────────────
// 47 turnos en los 6 días de septiembre que llevaba SV Barber.
check("promedio del mes sobre días transcurridos", Number((47 / mes.days).toFixed(2)), 7.83);
check("con el rango viejo daba esto", Number((47 / 30).toFixed(2)), 1.57);

// ─── Un lunes: el caso donde la semana es un solo día ───────────────────────
const lunes = new Date(2026, 8, 7);
const semanaLunes = rangoDelPeriodo("week", lunes);
check("el lunes la semana arranca ese mismo día", semanaLunes.start, "2026-09-07");
check("y es un solo día", semanaLunes.days, 1);
check(
  "la semana anterior se compara con un día, no con siete",
  rangoAnterior("week", semanaLunes.days, lunes).end,
  "2026-08-31",
);

// ─── La hora del día no puede cambiar la cuenta ─────────────────────────────
// El inicio de semana se normaliza a medianoche y `hoy` puede venir al
// mediodía: esa media jornada de diferencia redondeaba para arriba y sumaba un
// día fantasma al divisor de los promedios.
const domingo6AlMediodia = new Date(2026, 8, 6, 12, 0, 0);
check(
  "la semana da lo mismo a medianoche que al mediodía",
  rangoDelPeriodo("week", domingo6AlMediodia).days,
  semana.days,
);
check(
  "y el mes también",
  rangoDelPeriodo("month", domingo6AlMediodia).days,
  mes.days,
);
check("el mes al mediodía sigue siendo 6 días", rangoDelPeriodo("month", domingo6AlMediodia).days, 6);

// ─── El 1 del mes ───────────────────────────────────────────────────────────
const primero = new Date(2026, 8, 1);
const mesPrimero = rangoDelPeriodo("month", primero);
check("el día 1 el mes es un solo día", mesPrimero.days, 1);
check(
  "y se compara contra el 1 del mes anterior",
  rangoAnterior("month", mesPrimero.days, primero).end,
  "2026-08-01",
);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
