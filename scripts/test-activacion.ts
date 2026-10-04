/**
 * Tests de la activación de barberías recién registradas (feature 034).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-activacion.ts
 */
import {
  avisarAlFundador,
  diasEntre,
  enVentanaDeActivacion,
  mensajeParaClientes,
  pasoQueToca,
  textoParaBio,
  urlDeReservas,
} from "../src/lib/activacion.ts";

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

const con = (...tipos: string[]) => new Set(tipos);
const base = { turnos: 0, pruebaVigente: true };

// ── Días ────────────────────────────────────────────────────────────────────
check("el mismo día son 0", diasEntre("2026-10-04", "2026-10-04"), 0);
check("al día siguiente es 1", diasEntre("2026-10-04", "2026-10-05"), 1);
check("cruza el mes", diasEntre("2026-09-29", "2026-10-02"), 3);
check("una semana", diasEntre("2026-10-04", "2026-10-11"), 7);

// ── Qué paso toca ───────────────────────────────────────────────────────────
check(
  "el día del registro no se manda nada de la serie",
  pasoQueToca({ ...base, dias: 0, enviados: con("bienvenida") }),
  null,
);
check("día 1", pasoQueToca({ ...base, dias: 1, enviados: con("bienvenida") }), "dia_1");
check(
  "día 2 con el día 1 ya mandado: nada",
  pasoQueToca({ ...base, dias: 2, enviados: con("bienvenida", "dia_1") }),
  null,
);
check(
  "día 3",
  pasoQueToca({ ...base, dias: 3, enviados: con("bienvenida", "dia_1") }),
  "dia_3",
);
check(
  "día 7",
  pasoQueToca({ ...base, dias: 7, enviados: con("bienvenida", "dia_1", "dia_3") }),
  "dia_7",
);
check(
  "día 10 con todo mandado: nada",
  pasoQueToca({ ...base, dias: 10, enviados: con("bienvenida", "dia_1", "dia_3", "dia_7") }),
  null,
);

// El cron no corrió dos días: sale UN mail, el más avanzado.
check(
  "día 4 sin nada mandado: sale el del día 3, no el del 1",
  pasoQueToca({ ...base, dias: 4, enviados: con("bienvenida") }),
  "dia_3",
);
check(
  "día 9 sin nada mandado: sale el del día 7",
  pasoQueToca({ ...base, dias: 9, enviados: con("bienvenida") }),
  "dia_7",
);
check(
  "si ya salió el del día 7, no se vuelve a mandar uno anterior",
  pasoQueToca({ ...base, dias: 2, enviados: con("bienvenida", "dia_7") }),
  null,
);

// Lo que corta la serie.
check(
  "con el primer turno se corta",
  pasoQueToca({ dias: 3, turnos: 1, pruebaVigente: true, enviados: con("bienvenida") }),
  null,
);
check(
  "con la prueba vencida se corta",
  pasoQueToca({ dias: 3, turnos: 0, pruebaVigente: false, enviados: con("bienvenida") }),
  null,
);
check(
  "pasados los 14 días se corta",
  pasoQueToca({ ...base, dias: 15, enviados: con("bienvenida") }),
  null,
);
check(
  "el día 14 todavía entra",
  pasoQueToca({ ...base, dias: 14, enviados: con("bienvenida") }),
  "dia_7",
);
// La regla que protege a las barberías que ya existían y a las creadas a mano.
check(
  "sin bienvenida no hay serie (barbería vieja o creada desde /owner)",
  pasoQueToca({ ...base, dias: 3, enviados: con() }),
  null,
);

// ── Aviso al fundador ───────────────────────────────────────────────────────
check(
  "día 3 en cero: se le avisa al fundador",
  avisarAlFundador({ ...base, dias: 3, enviados: con("bienvenida") }),
  true,
);
check(
  "día 2 todavía no",
  avisarAlFundador({ ...base, dias: 2, enviados: con("bienvenida") }),
  false,
);
check(
  "una sola vez",
  avisarAlFundador({ ...base, dias: 5, enviados: con("bienvenida", "aviso_fundador") }),
  false,
);
check(
  "con turnos no se avisa",
  avisarAlFundador({ dias: 3, turnos: 2, pruebaVigente: true, enviados: con("bienvenida") }),
  false,
);
check(
  "sin bienvenida no se avisa",
  avisarAlFundador({ ...base, dias: 3, enviados: con() }),
  false,
);

// ── Ventana y textos ────────────────────────────────────────────────────────
check("a las 9 no", enVentanaDeActivacion(9), false);
check("a las 10 sí", enVentanaDeActivacion(10), true);
check("a las 13 ya no", enVentanaDeActivacion(13), false);
check(
  "la url de reservas no duplica la barra",
  urlDeReservas("https://tijerapp.com/", "leocuts"),
  "https://tijerapp.com/leocuts/reservar",
);
check(
  "la bio va sin https, que ocupa lugar y no hace falta",
  textoParaBio("https://tijerapp.com/leocuts/reservar"),
  "📅 Sacá tu turno online 👇\ntijerapp.com/leocuts/reservar",
);
check(
  "la bio entra en los 150 caracteres de Instagram",
  textoParaBio("https://tijerapp.com/una-barberia-de-nombre-bastante-largo/reservar").length <= 150,
  true,
);
check(
  "el mensaje para clientes nombra la barbería y lleva el link completo",
  mensajeParaClientes("Leo Cuts", "https://tijerapp.com/leocuts/reservar").includes(
    "Leo Cuts",
  ) &&
    mensajeParaClientes("Leo Cuts", "https://tijerapp.com/leocuts/reservar").endsWith(
      "https://tijerapp.com/leocuts/reservar",
    ),
  true,
);

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
