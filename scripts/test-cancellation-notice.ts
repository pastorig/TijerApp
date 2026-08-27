/**
 * Tests de cuándo se le avisa al cliente que le cancelaron (feature 026).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-cancellation-notice.ts
 */
import { debeAvisarCancelacion } from "../src/lib/cancellation-notice.ts";

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

const AHORA = { fecha: "2026-08-27", hora: "15:00" };
const decidir = (motivo: string | null, fecha: string, hora: string) =>
  debeAvisarCancelacion({ motivo, fecha, hora, ahora: AHORA });

// ── El caso que la feature viene a resolver ─────────────────────────────────
// La barbería cancela un turno futuro. Si nadie le dice, el cliente se presenta.
check(
  "un turno de mañana que cancela la barbería SÍ se avisa",
  decidir("Cierre imprevisto", "2026-08-28", "10:00"),
  { avisar: true },
);
check(
  "más tarde el mismo día también",
  decidir("Me voy antes", "2026-08-27", "19:00"),
  { avisar: true },
);
check("sin motivo cargado también se avisa", decidir(null, "2026-08-28", "10:00"), {
  avisar: true,
});

// ── Los tres silencios ──────────────────────────────────────────────────────
check(
  "un turno de ayer no se avisa",
  decidir("Cierre imprevisto", "2026-08-26", "10:00"),
  { avisar: false, porque: "el turno ya pasó" },
);
check(
  "uno de hoy más temprano tampoco",
  decidir("Cierre imprevisto", "2026-08-27", "11:00"),
  { avisar: false, porque: "el turno ya pasó" },
);

// El no-show es el peor momento para un mail automático: el cliente ya quedó
// mal y esto se lee como el remate.
check(
  "al que no vino no se le manda nada",
  decidir("Cliente no vino", "2026-08-28", "10:00"),
  { avisar: false, porque: "el cliente no vino" },
);
check(
  "y con la nota que agrega el diálogo, igual",
  decidir("Cliente no vino — avisó tarde", "2026-08-28", "10:00"),
  { avisar: false, porque: "el cliente no vino" },
);

// Lo pidió él: contárselo es ruido.
check(
  "si avisó el cliente, no se le avisa de vuelta",
  decidir("Cliente avisó", "2026-08-28", "10:00"),
  { avisar: false, porque: "lo pidió el cliente" },
);
check(
  "también con notas",
  decidir("Cliente avisó — se le complicó", "2026-08-28", "10:00"),
  { avisar: false, porque: "lo pidió el cliente" },
);

// ── Bordes ──────────────────────────────────────────────────────────────────
// Justo la hora del turno cuenta como pasado: a esa altura el cliente ya está
// en la puerta y el mail no llega a tiempo de servir para nada.
check(
  "justo a la hora del turno ya no se avisa",
  decidir("Cierre imprevisto", "2026-08-27", "15:00"),
  { avisar: false, porque: "el turno ya pasó" },
);
check(
  "un minuto después sí",
  decidir("Cierre imprevisto", "2026-08-27", "15:01"),
  { avisar: true },
);
check(
  "acepta el formato con segundos que devuelve la base",
  decidir("Cierre imprevisto", "2026-08-28", "10:00:00"),
  { avisar: true },
);
// Un motivo escrito a mano no tiene por qué respetar mayúsculas.
check(
  "el motivo no distingue mayúsculas",
  decidir("cliente avisó", "2026-08-28", "10:00"),
  { avisar: false, porque: "lo pidió el cliente" },
);
check(
  "un motivo cualquiera del dueño no calla el aviso",
  decidir("Se cortó la luz", "2026-08-28", "10:00"),
  { avisar: true },
);

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
