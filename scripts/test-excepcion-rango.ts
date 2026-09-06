/**
 * Tests de la expansión de un rango a las fechas que hay que escribir.
 *
 * El caso que originó la feature: un barbero quiere hacer horas extra del lunes
 * 14 al viernes 18 de septiembre de 2026 sin tocar su regla semanal.
 *
 * Correr: node --experimental-strip-types scripts/test-excepcion-rango.ts
 */
import { fechasDelRango, MAX_DIAS_DE_RANGO } from "../src/lib/excepcion-rango.ts";

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

// Un barbero que trabaja de lunes a sábado y descansa el domingo.
const deLunesASabado = (dia: number) => dia !== 0;
const HOY = new Date(2026, 8, 6); // domingo 6 de septiembre de 2026

// ─── El caso real ───────────────────────────────────────────────────────────
const semana = fechasDelRango({
  desde: "2026-09-14",
  hasta: "2026-09-18",
  trabajaEseDia: deLunesASabado,
  hoy: HOY,
});
check("del 14 al 18 son cinco días", semana.ok && semana.fechas.length, 5);
check(
  "y son esos días",
  semana.ok && semana.fechas,
  ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"],
);

// ─── Los domingos no se abren solos ─────────────────────────────────────────
const quincena = fechasDelRango({
  desde: "2026-09-14",
  hasta: "2026-09-28",
  trabajaEseDia: deLunesASabado,
  hoy: HOY,
});
check(
  "un rango largo saltea los domingos",
  quincena.ok && quincena.salteadas,
  ["2026-09-20", "2026-09-27"],
);
check("y no los mete en las fechas", quincena.ok && quincena.fechas.includes("2026-09-20"), false);

const conDiasLibres = fechasDelRango({
  desde: "2026-09-14",
  hasta: "2026-09-28",
  trabajaEseDia: deLunesASabado,
  incluirDiasLibres: true,
  hoy: HOY,
});
check(
  "pidiéndolo explícitamente, los domingos entran",
  conDiasLibres.ok && conDiasLibres.fechas.length,
  15,
);
check("y no queda nada salteado", conDiasLibres.ok && conDiasLibres.salteadas.length, 0);

// ─── Validaciones ───────────────────────────────────────────────────────────
const invertido = fechasDelRango({
  desde: "2026-09-18",
  hasta: "2026-09-14",
  trabajaEseDia: deLunesASabado,
  hoy: HOY,
});
check("rango invertido se rechaza", invertido.ok, false);

const ayer = fechasDelRango({
  desde: "2026-09-05",
  hasta: "2026-09-10",
  trabajaEseDia: deLunesASabado,
  hoy: HOY,
});
check("un rango que arranca ayer se rechaza", ayer.ok, false);

const hoyMismo = fechasDelRango({
  desde: "2026-09-06",
  hasta: "2026-09-06",
  trabajaEseDia: deLunesASabado,
  incluirDiasLibres: true,
  hoy: HOY,
});
check("hoy mismo sí se puede", hoyMismo.ok && hoyMismo.fechas, ["2026-09-06"]);

const unDia = fechasDelRango({
  desde: "2026-09-14",
  hasta: "2026-09-14",
  trabajaEseDia: deLunesASabado,
  hoy: HOY,
});
check("un rango de un solo día es válido", unDia.ok && unDia.fechas.length, 1);

const largo = fechasDelRango({
  desde: "2026-09-14",
  hasta: "2027-09-14",
  trabajaEseDia: deLunesASabado,
  hoy: HOY,
});
check(`más de ${MAX_DIAS_DE_RANGO} días se rechaza`, largo.ok, false);

// Un rango de puros días libres sin el tilde no tiene nada que escribir: mejor
// decirlo que guardar cero filas y que parezca que anduvo.
const soloDomingos = fechasDelRango({
  desde: "2026-09-20",
  hasta: "2026-09-20",
  trabajaEseDia: deLunesASabado,
  hoy: HOY,
});
check("un rango de puros días libres avisa", soloDomingos.ok, false);

// ─── Cruce de mes ───────────────────────────────────────────────────────────
const cruzaMes = fechasDelRango({
  desde: "2026-09-28",
  hasta: "2026-10-02",
  trabajaEseDia: deLunesASabado,
  hoy: HOY,
});
check("un rango que cruza de mes no tiene nada especial", cruzaMes.ok && cruzaMes.fechas.length, 5);
check(
  "y las fechas son correctas",
  cruzaMes.ok && cruzaMes.fechas,
  ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"],
);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
