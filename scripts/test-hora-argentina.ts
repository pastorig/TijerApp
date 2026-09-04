/**
 * Tests de la hora de la barbería contra la del servidor.
 *
 * Existe por un reporte de SV Barber: querían reservar a las 17:20 con una
 * anticipación mínima de 60 minutos configurada, y la app respondía que el
 * turno estaba muy cerca. El motor decidía "falta muy poco" con
 * `now.getHours()`, que en Vercel devuelve UTC: tres horas adelante. A las
 * 14:20 de Argentina el servidor creía que eran las 17:20 y veía el turno
 * encima.
 *
 * Correr: node --experimental-strip-types scripts/test-hora-argentina.ts
 */
import { buildAvailabilitySlots } from "../src/lib/availability.ts";
import { ahoraEnArgentina } from "../src/lib/hora-argentina.ts";

let passed = 0;
let failed = 0;

function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

// ─── El reloj ────────────────────────────────────────────────────────────────
// 2026-09-04 17:20 UTC son las 14:20 en Argentina (UTC-3).
const instante = new Date("2026-09-04T17:20:00Z");
const arg = ahoraEnArgentina(instante);

check("la hora argentina de las 17:20 UTC es 14", arg.getHours(), 14);
check("y los minutos no se mueven", arg.getMinutes(), 20);
check("el día es el 4", arg.getDate(), 4);

// A las 00:30 UTC del día 5 en Argentina todavía es el 4, a las 21:30.
const cruceDeDia = ahoraEnArgentina(new Date("2026-09-05T00:30:00Z"));
check("a las 00:30 UTC en Argentina sigue siendo el día anterior", cruceDeDia.getDate(), 4);
check("y son las 21:30", `${cruceDeDia.getHours()}:${cruceDeDia.getMinutes()}`, "21:30");

// ─── El efecto en la agenda ──────────────────────────────────────────────────
// La grilla del caso real. El barbero vuelve de la pausa a las 16:00 y la
// grilla arranca de nuevo ahí: 16:00, 16:40, 17:20… Por eso 17:20 es un
// horario suyo, y es el que la barbería no podía reservar.
const agenda = (now: Date) =>
  buildAvailabilitySlots({
    appointmentDate: "2026-09-04",
    appointmentDurationMinutes: 40,
    barbershopIntervalMinutes: 40,
    workingHours: { start: "16:00", end: "21:40" },
    weeklySchedules: [],
    dayOverride: null,
    timeBlocks: [],
    appointments: [],
    minBookingNoticeMinutes: 60,
    now,
  });

const buscar = (slots: ReturnType<typeof agenda>, hora: string) =>
  slots.find((s) => s.time === hora);

// Con el reloj de la barbería (14:20) faltan 3 horas para las 17:20: se reserva.
const conHoraArgentina = buscar(agenda(arg), "17:20");
check("a las 14:20 de Argentina, las 17:20 se pueden reservar", conHoraArgentina?.isAvailable, true);

// Con el reloj del servidor (17:20 UTC leído como hora local) el turno parece
// estar empezando. Este es exactamente el bug que se reportó.
const comoLoVeiaVercel = buscar(agenda(new Date(2026, 8, 4, 17, 20)), "17:20");
check(
  "con el reloj del servidor el mismo turno se rechazaba",
  comoLoVeiaVercel?.isAvailable,
  false,
);
check("y encima decía que faltaba poco", comoLoVeiaVercel?.reason, "too-soon");

// La anticipación tiene que seguir frenando lo que de verdad está encima:
// 16:00 de Argentina, turno de las 16:40, mínimo 60 min.
const faltaPoco = buscar(agenda(new Date(2026, 8, 4, 16, 0)), "16:40");
check("la anticipación mínima sigue frenando lo que está encima", faltaPoco?.isAvailable, false);
check("con el motivo correcto", faltaPoco?.reason, "too-soon");

// Y lo que ya pasó sigue siendo pasado.
const yaPaso = buscar(agenda(new Date(2026, 8, 4, 18, 0)), "16:00");
check("lo que ya pasó sigue marcado como pasado", yaPaso?.reason, "past");

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
