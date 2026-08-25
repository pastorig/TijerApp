/**
 * Tests del conteo de turnos por día (los puntitos del calendario del empleado).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-staff-agenda-counts.ts
 */
import { contarPorDia } from "../src/lib/staff-agenda-counts.ts";

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

const fila = (appointment_date: string, status: string) => ({
  appointment_date,
  status,
});

check("sin turnos, no hay conteos", contarPorDia([]), {});

check(
  "suma los del mismo día",
  contarPorDia([
    fila("2026-08-25", "confirmed"),
    fila("2026-08-25", "pending"),
    fila("2026-08-26", "confirmed"),
  ]),
  { "2026-08-25": 2, "2026-08-26": 1 },
);

// Un cancelado que sumara pintaría un punto en un día que está libre. Es el
// error que no se ve mirando la pantalla: hay que contar a mano para notarlo.
check(
  "los cancelados no cuentan",
  contarPorDia([
    fila("2026-08-25", "cancelled"),
    fila("2026-08-25", "confirmed"),
  ]),
  { "2026-08-25": 1 },
);

check(
  "un día que queda entero en cancelados desaparece",
  contarPorDia([fila("2026-08-25", "cancelled")]),
  {},
);

// La consulta ya filtra `deleted`, pero si mañana alguien saca ese filtro el
// conteo no tiene que empezar a mentir por su cuenta.
check(
  "los borrados tampoco",
  contarPorDia([fila("2026-08-25", "deleted"), fila("2026-08-25", "pending")]),
  { "2026-08-25": 1 },
);

check(
  "un estado desconocido no se cuela",
  contarPorDia([fila("2026-08-25", "vaya-a-saber")]),
  {},
);

check(
  "una fila sin fecha no rompe ni inventa una clave vacía",
  contarPorDia([fila("", "confirmed"), fila("2026-08-25", "confirmed")]),
  { "2026-08-25": 1 },
);

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
