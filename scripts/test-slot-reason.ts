/**
 * Tests del motivo que se le muestra al cliente cuando un horario no se puede
 * reservar.
 *
 * Existe por un reporte de SV Barber: dijeron que un barbero le bloqueaba la
 * agenda a otro. No era eso — el horario caía fuera del día de ese barbero,
 * pero TODOS los motivos se mostraban como "acaba de ocuparse", así que
 * salieron a buscar un choque de reservas que nunca existió. Lo que se prueba
 * acá es que cada motivo diga lo suyo.
 *
 * Correr: node --experimental-strip-types scripts/test-slot-reason.ts
 */
import type { AvailabilitySlot } from "../src/lib/availability.ts";
import { motivoDeHorario } from "../src/lib/slot-reason.ts";

let passed = 0;
let failed = 0;

function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

// El motivo que de verdad significa "alguien te lo ganó de mano" es UNO solo.
check(
  "ocupado dice que se ocupó",
  motivoDeHorario("occupied"),
  "Ese horario acaba de ocuparse. Elegí otro.",
);

// Y estos NO pueden decirlo, que es el bug que se reportó.
const noSonChoques: Array<AvailabilitySlot["reason"]> = [
  "outside-hours",
  "blocked",
  "past",
  "too-soon",
];
for (const motivo of noSonChoques) {
  check(
    `"${motivo}" no se hace pasar por una reserva ajena`,
    /ocuparse/i.test(motivoDeHorario(motivo)),
    false,
  );
}

check(
  "fuera del horario del barbero lo dice con todas las letras",
  motivoDeHorario("outside-hours"),
  "Ese barbero no atiende a esa hora. Elegí otro horario.",
);

// El caso de SV Barber: dos barberos con grillas distintas. El horario del otro
// ni siquiera figura en la del primero, así que no hay slot y no hay motivo.
check(
  "un horario que no está en la grilla de ese barbero",
  motivoDeHorario(undefined),
  "Ese horario no está en la agenda de ese barbero. Elegí otro.",
);
check("sin motivo se comporta igual", motivoDeHorario(null), motivoDeHorario(undefined));
check(
  "'available' no debería llegar acá, pero no rompe",
  typeof motivoDeHorario("available"),
  "string",
);

// Si mañana se agrega un motivo nuevo a la grilla y nadie le escribe un texto,
// se cae en el genérico y volvemos a esconder la causa. Que falle acá.
const TODOS: Array<AvailabilitySlot["reason"]> = [
  "available",
  "outside-hours",
  "blocked",
  "occupied",
  "past",
  "too-soon",
];
const generico = motivoDeHorario(undefined);
const sinTexto = TODOS.filter(
  (m) => m !== "available" && motivoDeHorario(m) === generico,
);
check("todos los motivos tienen su propio texto", sinTexto.join(",") || "ninguno", "ninguno");

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
