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
import {
  MAX_ATRAS,
  nombreDelPeriodo,
  rangoAnterior,
  rangoDeComparacion,
  rangoDelPeriodo,
  rangoMirado,
} from "../src/lib/report-ranges.ts";

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

// ─── 043: períodos anteriores ───────────────────────────────────────────────
// Bautista (25/11): "si querés ver el mes anterior no deja".
const hoy25 = new Date(2026, 10, 25, 15, 0, 0); // miércoles 25/11/2026, a la tarde

// El actual (atrás 0) no cambia nada.
check("atrás 0 = el mes de siempre", rangoMirado("month", hoy25, 0).end, "2026-11-25");
check("atrás 0 compara igual que antes", rangoDeComparacion("month", hoy25, 0).end, "2026-10-25");

const octubre = rangoMirado("month", hoy25, 1);
check("octubre arranca el 1", octubre.start, "2026-10-01");
check("y se cuenta entero hasta el 31", octubre.end, "2026-10-31");
check("31 días", octubre.days, 31);
const septiembre = rangoDeComparacion("month", hoy25, 1);
check("se compara contra septiembre entero", `${septiembre.start}/${septiembre.end}`, "2026-09-01/2026-09-30");
check("febrero tiene 28", rangoMirado("month", hoy25, 9).days, 28);
check("cruza el año para atrás", rangoMirado("month", hoy25, 11).start, "2025-12-01");

const semanaPasada = rangoMirado("week", hoy25, 1);
check("la semana pasada es de lunes", semanaPasada.start, "2026-11-16");
check("a domingo", semanaPasada.end, "2026-11-22");
check("7 días", semanaPasada.days, 7);
check("contra la de antes", rangoDeComparacion("week", hoy25, 1).start, "2026-11-09");

check("ayer", rangoMirado("today", hoy25, 1).start, "2026-11-24");
check("contra anteayer", rangoDeComparacion("today", hoy25, 1).start, "2026-11-23");

// Nombres
check("nombre del mes actual", nombreDelPeriodo("month", hoy25, 0), "Este mes");
check("nombre del mes pasado", nombreDelPeriodo("month", hoy25, 1), "Octubre 2026");
check("nombre de semana pasada", nombreDelPeriodo("week", hoy25, 1), "Semana pasada");
check("semana dentro de un mes", nombreDelPeriodo("week", hoy25, 2), "9 – 15 nov");
check("semana que cruza meses", nombreDelPeriodo("week", hoy25, 4), "26 oct – 1 nov");
check("ayer", nombreDelPeriodo("today", hoy25, 1), "Ayer");
check("día con nombre", nombreDelPeriodo("today", hoy25, 2), "lunes 23/11");
check("día de otro año", nombreDelPeriodo("today", hoy25, 330), "martes 30/12/2025");

// Topes: nunca al futuro, nunca más de 24 meses.
check("atrás negativo = el actual", rangoMirado("month", hoy25, -3).end, "2026-11-25");
check("tope de 24 meses", rangoMirado("month", hoy25, 99).start, rangoMirado("month", hoy25, MAX_ATRAS.month).start);
check("el tope es noviembre 2024", rangoMirado("month", hoy25, 24).start, "2024-11-01");

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
