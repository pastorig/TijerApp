/**
 * Tests del motivo de cancelación del empleado (feature 020).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-staff-cancellation.ts
 */
import {
  MAX_MOTIVO,
  motivoParaGuardar,
} from "../src/lib/staff-cancellation.ts";

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

// ── Lo que se guarda al cancelar ────────────────────────────────────────────
check(
  "el motivo del diálogo se guarda tal cual",
  motivoParaGuardar("cancelled", "No vino"),
  "No vino",
);

check(
  "el preset con notas también",
  motivoParaGuardar("cancelled", "No vino — avisó tarde"),
  "No vino — avisó tarde",
);

// El "sin motivo" en la base ya se representa con null. Tener además "" obliga
// a chequear las dos formas para siempre, en cada lugar que lea el campo.
check("sin motivo queda null, no cadena vacía", motivoParaGuardar("cancelled", ""), null);
check("solo espacios también es null", motivoParaGuardar("cancelled", "   "), null);
check("un motivo ausente es null", motivoParaGuardar("cancelled", undefined), null);
check("y uno que no es texto tampoco explota", motivoParaGuardar("cancelled", 42), null);

// ── Confirmar nunca lleva motivo ────────────────────────────────────────────
// Un turno confirmado con un motivo de cancelación pegado es basura que
// después alguien lee como si significara algo.
check(
  "al confirmar el motivo se descarta aunque lo manden",
  motivoParaGuardar("confirmed", "No vino"),
  null,
);

// ── El tope ─────────────────────────────────────────────────────────────────
{
  const largo = "x".repeat(MAX_MOTIVO + 120);
  const guardado = motivoParaGuardar("cancelled", largo);
  check("un texto larguísimo se corta al tope", (guardado ?? "").length, MAX_MOTIVO);
}

// El corte no puede dejar un espacio colgando al final.
{
  const conEspacio = "y".repeat(MAX_MOTIVO - 1) + "  sobra";
  const guardado = motivoParaGuardar("cancelled", conEspacio) ?? "";
  check("el corte no deja espacios al final", guardado === guardado.trimEnd(), true);
}

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
