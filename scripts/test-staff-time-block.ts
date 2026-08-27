/**
 * Tests del bloqueo de horario del empleado (feature 023).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-staff-time-block.ts
 */
import {
  aMinutos,
  turnosEnRango,
  validarRango,
} from "../src/lib/staff-time-block.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(
    `${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`}`,
  );
  if (ok) passed++;
  else failed++;
}

// ── Parseo de horarios ──────────────────────────────────────────────────────
check("una hora simple", aMinutos("17:30"), 1050);
check("acepta el formato con segundos que devuelve la base", aMinutos("09:00:00"), 540);
check("una hora que no existe es null", aMinutos("25:00"), null);
check("los minutos también se validan", aMinutos("10:75"), null);
check("cualquier cosa que no sea texto es null", aMinutos(1730), null);
check("un texto cualquiera es null", aMinutos("mañana"), null);

// ── El rango ────────────────────────────────────────────────────────────────
check("un rango normal se normaliza", validarRango("17:00", "20:00"), {
  ok: true,
  desde: "17:00",
  hasta: "20:00",
});

// El invertido es el error típico de quien tipea rápido: si pasara, el bloqueo
// no taparía nada y el barbero creería que sí.
check(
  "el rango invertido se rechaza",
  validarRango("20:00", "17:00").ok,
  false,
);

// Un bloqueo que no tapa nada es un registro que después nadie entiende.
check(
  "el rango de duración cero se rechaza",
  validarRango("17:00", "17:00").ok,
  false,
);

check("sin horarios se rechaza", validarRango("", "").ok, false);
check("un horario roto se rechaza", validarRango("17:00", "cualquiera").ok, false);

// ── Turnos que quedan adentro del bloqueo ───────────────────────────────────
const t = (
  appointment_time: string,
  service_duration_minutes: number | null,
  status = "confirmed",
) => ({ appointment_time, service_duration_minutes, status });

check(
  "un turno justo en el medio cuenta",
  turnosEnRango([t("18:00", 30)], "17:00", "20:00"),
  1,
);

// Lo que hace falta contar es el SOLAPAMIENTO, no la hora de inicio: si solo se
// mirara el inicio, este turno quedaría afuera y el barbero no se enteraría de
// que tiene un cliente encima del bloqueo.
check(
  "un turno que arranca antes pero termina adentro cuenta",
  turnosEnRango([t("16:45", 45)], "17:00", "20:00"),
  1,
);

check(
  "uno que termina justo cuando arranca el bloqueo NO cuenta",
  turnosEnRango([t("16:30", 30)], "17:00", "20:00"),
  0,
);

check(
  "uno que arranca justo cuando termina el bloqueo tampoco",
  turnosEnRango([t("20:00", 30)], "17:00", "20:00"),
  0,
);

check(
  "sin duración cargada se asumen 30 minutos",
  turnosEnRango([t("16:45", null)], "17:00", "20:00"),
  1,
);

check(
  "los cancelados no cuentan: ese horario ya está libre",
  turnosEnRango([t("18:00", 30, "cancelled")], "17:00", "20:00"),
  0,
);

check(
  "cuenta varios",
  turnosEnRango(
    [t("17:30", 30), t("19:00", 30), t("09:00", 30)],
    "17:00",
    "20:00",
  ),
  2,
);

check("sin turnos, cero", turnosEnRango([], "17:00", "20:00"), 0);

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
