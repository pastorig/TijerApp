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
import {
  aMinutos,
  motivoDeHorario,
  motivoFueraDeGrilla,
} from "../src/lib/slot-reason.ts";

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

// ── Un horario que NO está en la grilla ─────────────────────────────────────
// La grilla no trae los horarios que pisan un turno. Uno que se ocupó mientras
// el cliente llenaba el formulario desaparecía y recibía "no está en la agenda
// de ese barbero", cuando lo cierto es que se lo ganaron de mano.
const turnos = [{ inicio: aMinutos("09:00"), fin: aMinutos("09:45") }];
const bloqueos = [{ inicio: aMinutos("13:00:00"), fin: aMinutos("14:00:00") }];

check(
  "la misma hora que un turno: se ocupó",
  motivoFueraDeGrilla({ inicio: aMinutos("09:00"), duracion: 30, turnos, bloqueos }),
  "occupied",
);
check(
  "empieza en el medio de un turno: se ocupó",
  motivoFueraDeGrilla({ inicio: aMinutos("09:20"), duracion: 20, turnos, bloqueos }),
  "occupied",
);
check(
  "empieza antes y termina adentro de un turno: se ocupó",
  motivoFueraDeGrilla({ inicio: aMinutos("08:40"), duracion: 30, turnos, bloqueos }),
  "occupied",
);
check(
  "pegado al final de un turno NO lo pisa",
  motivoFueraDeGrilla({ inicio: aMinutos("09:45"), duracion: 30, turnos, bloqueos }),
  null,
);
check(
  "termina justo cuando empieza un turno NO lo pisa",
  motivoFueraDeGrilla({ inicio: aMinutos("08:30"), duracion: 30, turnos, bloqueos }),
  null,
);
check(
  "pisa un bloqueo: está bloqueado, no ocupado",
  motivoFueraDeGrilla({ inicio: aMinutos("13:30"), duracion: 30, turnos, bloqueos }),
  "blocked",
);
// El caso de SV Barber no cambia: no pisa nada, así que sigue sin motivo y el
// cartel sigue diciendo que ese horario no es de ese barbero.
check(
  "fuera del día del barbero y sin pisar nada: sin motivo",
  motivoDeHorario(
    motivoFueraDeGrilla({ inicio: aMinutos("07:15"), duracion: 30, turnos, bloqueos }),
  ),
  "Ese horario no está en la agenda de ese barbero. Elegí otro.",
);
check(
  "y el que se ocupó ahora lo dice",
  motivoDeHorario(
    motivoFueraDeGrilla({ inicio: aMinutos("09:20"), duracion: 20, turnos, bloqueos }),
  ),
  "Ese horario acaba de ocuparse. Elegí otro.",
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
