/**
 * Tests del recuento de visitas por cliente (pura). Blinda el bug que reportó
 * SV Barber: los turnos 'pending' (reservados y nunca confirmados) NO deben
 * contar como visita — antes sí lo hacían e inflaban el conteo/segmento.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-visits.ts
 */
import {
  computeSegment,
  isCompletedVisit,
} from "../src/lib/client-segments.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

const TODAY = "2026-07-15";

// isCompletedVisit: solo confirmado + pasado.
check("confirmado pasado → cuenta", isCompletedVisit("confirmed", "2026-01-10", TODAY), true);
check("confirmado hoy → cuenta", isCompletedVisit("confirmed", TODAY, TODAY), true);
check("PENDING pasado → NO cuenta (el bug)", isCompletedVisit("pending", "2026-01-10", TODAY), false);
check("cancelado pasado → NO cuenta", isCompletedVisit("cancelled", "2026-01-10", TODAY), false);
check("eliminado pasado → NO cuenta", isCompletedVisit("deleted", "2026-01-10", TODAY), false);
check("confirmado FUTURO → NO cuenta todavía", isCompletedVisit("confirmed", "2026-12-01", TODAY), false);

// Integración: cliente con 2 confirmados pasados + 1 pending pasado.
// Debe dar 2 visitas → segmento "activo" (NO "recurrente", que exige 3).
const appts = [
  { status: "confirmed", date: "2026-06-01" },
  { status: "confirmed", date: "2026-06-20" },
  { status: "pending", date: "2026-07-01" }, // reservado, nunca confirmado
];
const visits = appts.filter((a) => isCompletedVisit(a.status, a.date, TODAY)).length;
check("2 confirmados + 1 pending → 2 visitas", visits, 2);
check("2 visitas → segmento 'activo' (no recurrente)", computeSegment({ visits, daysSinceLastVisit: 25 }), "activo");

// Contraprueba del bug viejo: si contáramos el pending, darían 3 → recurrente.
check("(bug viejo) 3 visitas → habría sido 'recurrente'", computeSegment({ visits: 3, daysSinceLastVisit: 25 }), "recurrente");

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
