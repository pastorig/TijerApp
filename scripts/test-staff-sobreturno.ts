/**
 * Tests del sobreturno del empleado (feature 032).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-staff-sobreturno.ts
 */
import { leerSobreturno } from "../src/lib/staff-sobreturno.ts";

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

check("sin la marca es un turno común", leerSobreturno({}), { esSobreturno: false });
check(
  "un cliente viejo que no manda nada sigue cargando turnos comunes",
  leerSobreturno({ serviceId: "x", time: "10:00" }),
  { esSobreturno: false },
);
// Solo true lo prende: un sobreturno se saltea el índice de horario único, así
// que no puede activarse por un valor "parecido".
check('"true" en texto no lo prende', leerSobreturno({ sobreturno: "true" }), {
  esSobreturno: false,
});
check("1 no lo prende", leerSobreturno({ sobreturno: 1 }), { esSobreturno: false });

check("sin duración son 15 minutos", leerSobreturno({ sobreturno: true }), {
  esSobreturno: true,
  duracion: 15,
});
for (const d of [10, 15, 20, 30]) {
  check(`${d} minutos se acepta`, leerSobreturno({ sobreturno: true, duracion: d }), {
    esSobreturno: true,
    duracion: d,
  });
}
// La duración libre sería una forma de bloquear el día sin el permiso de bloquear.
for (const d of [0, 5, 45, 480, -15, 15.5]) {
  const r = leerSobreturno({ sobreturno: true, duracion: d });
  check(`${d} minutos se rechaza`, "error" in r, true);
}
check(
  "la duración en texto se rechaza",
  "error" in leerSobreturno({ sobreturno: true, duracion: "15" }),
  true,
);

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
