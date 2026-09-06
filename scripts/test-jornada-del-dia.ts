/**
 * Tests de la precedencia de horarios: qué manda sobre qué al armar el día.
 *
 * El que más importa es el de la pausa. Cuando una fecha tenía excepción, el
 * motor armaba el día con la pausa en null —la excepción reemplazaba la jornada
 * entera, almuerzo incluido— y el código lo llamaba "caso edge raro". No lo es:
 * 5 de los barberos en producción tienen pausa, y ya pegó dos veces. El 30 y el
 * 31 de julio de 2026, un barbero con pausa de 13:00 a 16:00 quedó con esas
 * tres horas abiertas a reservas.
 *
 * Correr: node --experimental-strip-types scripts/test-jornada-del-dia.ts
 */
import {
  resolverJornadaDelDia,
  turnosFueraDeJornada,
  type ExcepcionDelDia,
  type ReglaSemanalDelDia,
} from "../src/lib/jornada-del-dia.ts";

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

const BARBERIA = { start: "09:00", end: "21:00" };

// El caso real: Tomás Campal, 11:00 a 21:40 con almuerzo de 13:00 a 16:00.
const campal: ReglaSemanalDelDia = {
  startTime: "11:00:00",
  endTime: "21:40:00",
  isWorking: true,
  breakStart: "13:00:00",
  breakEnd: "16:00:00",
};

const horasExtra: ExcepcionDelDia = {
  startTime: "09:00",
  endTime: "22:00",
  isWorking: true,
  heredaPausa: true,
  breakStart: null,
  breakEnd: null,
};

// ─── La precedencia ─────────────────────────────────────────────────────────
check(
  "sin excepción manda la regla semanal",
  resolverJornadaDelDia({ reglaSemanal: campal, excepcion: null, horarioBarberia: BARBERIA }),
  {
    trabaja: true,
    inicio: "11:00",
    fin: "21:40",
    pausa: { inicio: "13:00", fin: "16:00" },
    origen: "regla-semanal",
  },
);

check(
  "sin regla semanal manda el horario de la barbería",
  resolverJornadaDelDia({ reglaSemanal: null, excepcion: null, horarioBarberia: BARBERIA }),
  { trabaja: true, inicio: "09:00", fin: "21:00", pausa: null, origen: "horario-barberia" },
);

check(
  "la excepción pisa a la regla semanal",
  resolverJornadaDelDia({ reglaSemanal: campal, excepcion: horasExtra, horarioBarberia: BARBERIA })
    .inicio,
  "09:00",
);

// ─── LA PAUSA: el bug que ya pegó dos veces ─────────────────────────────────
check(
  "con horas extra, el almuerzo SIGUE ahí",
  resolverJornadaDelDia({ reglaSemanal: campal, excepcion: horasExtra, horarioBarberia: BARBERIA })
    .pausa,
  { inicio: "13:00", fin: "16:00" },
);

check(
  "pausa propia de ese día",
  resolverJornadaDelDia({
    reglaSemanal: campal,
    excepcion: { ...horasExtra, heredaPausa: false, breakStart: "14:00", breakEnd: "15:00" },
    horarioBarberia: BARBERIA,
  }).pausa,
  { inicio: "14:00", fin: "15:00" },
);

check(
  "ese día no para a comer",
  resolverJornadaDelDia({
    reglaSemanal: campal,
    excepcion: { ...horasExtra, heredaPausa: false },
    horarioBarberia: BARBERIA,
  }).pausa,
  null,
);

check(
  "heredar de una regla sin pausa no inventa una",
  resolverJornadaDelDia({
    reglaSemanal: { ...campal, breakStart: null, breakEnd: null },
    excepcion: horasExtra,
    horarioBarberia: BARBERIA,
  }).pausa,
  null,
);

check(
  "excepción sin regla semanal y heredando: no hay de dónde sacar pausa",
  resolverJornadaDelDia({ reglaSemanal: null, excepcion: horasExtra, horarioBarberia: BARBERIA })
    .pausa,
  null,
);

// ─── Día cerrado ────────────────────────────────────────────────────────────
check(
  "la excepción puede cerrar el día aunque traiga horario",
  resolverJornadaDelDia({
    reglaSemanal: campal,
    excepcion: { ...horasExtra, isWorking: false },
    horarioBarberia: BARBERIA,
  }).trabaja,
  false,
);

check(
  "la excepción puede ABRIR un día que la regla tenía cerrado",
  resolverJornadaDelDia({
    reglaSemanal: { ...campal, isWorking: false },
    excepcion: horasExtra,
    horarioBarberia: BARBERIA,
  }).trabaja,
  true,
);

// ─── El origen ──────────────────────────────────────────────────────────────
check("origen excepción", resolverJornadaDelDia({ reglaSemanal: campal, excepcion: horasExtra, horarioBarberia: BARBERIA }).origen, "excepcion");
check("origen regla semanal", resolverJornadaDelDia({ reglaSemanal: campal, excepcion: null, horarioBarberia: BARBERIA }).origen, "regla-semanal");
check("origen barbería", resolverJornadaDelDia({ reglaSemanal: null, excepcion: null, horarioBarberia: BARBERIA }).origen, "horario-barberia");

// Las horas con segundos de la base y las cortas de la grilla son lo mismo.
check(
  "normaliza HH:MM:SS a HH:MM",
  resolverJornadaDelDia({ reglaSemanal: campal, excepcion: null, horarioBarberia: BARBERIA }).fin,
  "21:40",
);

// ─── Turnos que quedan afuera ───────────────────────────────────────────────
const jornadaCorta = resolverJornadaDelDia({
  reglaSemanal: null,
  excepcion: {
    startTime: "15:00",
    endTime: "18:00",
    isWorking: true,
    heredaPausa: false,
    breakStart: null,
    breakEnd: null,
  },
  horarioBarberia: BARBERIA,
});

const turnos = [
  { hora: "14:00", duracionMinutos: 40, cliente: "Temprano" },
  { hora: "16:00", duracionMinutos: 40, cliente: "Adentro" },
  { hora: "17:40", duracionMinutos: 40, cliente: "Se pasa del cierre" },
  { hora: "19:40", duracionMinutos: 40, cliente: "Martín" },
];

check(
  "lista los que no entran",
  turnosFueraDeJornada(turnos, jornadaCorta).map((t) => `${t.cliente}:${t.motivo}`),
  ["Temprano:antes", "Se pasa del cierre:despues", "Martín:despues"],
);

// Un turno que EMPIEZA adentro pero termina afuera cuenta como afuera, igual
// que en la grilla. Si contara distinto, el aviso mentiría.
check(
  "el que empieza adentro y termina afuera está afuera",
  turnosFueraDeJornada([{ hora: "17:40", duracionMinutos: 40, cliente: "X" }], jornadaCorta).length,
  1,
);

check(
  "un turno que cae en la pausa también queda afuera",
  turnosFueraDeJornada(
    [{ hora: "14:00", duracionMinutos: 40, cliente: "Almuerzo" }],
    resolverJornadaDelDia({ reglaSemanal: campal, excepcion: null, horarioBarberia: BARBERIA }),
  )[0]?.motivo,
  "en-pausa",
);

check(
  "con el día cerrado, todos quedan afuera",
  turnosFueraDeJornada(turnos, { ...jornadaCorta, trabaja: false }).length,
  turnos.length,
);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
