/**
 * Tests de la ocupación de cada día, que decide el color del punto en el
 * calendario del mes.
 *
 * Existe por un pedido de un barbero: el punto iba por CANTIDAD de turnos con
 * cortes fijos (4 y 7), y eso no dice lo mismo para uno que corta cada 45
 * minutos que para una barbería de tres. Lo que se prueba acá es que el color
 * salga de cuánto del día está tomado, y que esa cuenta coincida con el
 * "% ocupado" del calendario del día.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-ocupacion-del-mes.ts
 */
import { ocupacionDelDia, type JornadaParaLayout } from "../src/lib/agenda-layout.ts";
import { nivelDeOcupacion, ocupacionPorDia } from "../src/lib/ocupacion-del-mes.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`}`);
  if (ok) passed++;
  else failed++;
}

const h = (hhmm: string) => {
  const [a, b] = hhmm.split(":").map(Number);
  return a * 60 + b;
};
const jornada = (inicio: string, fin: string, pausa?: [string, string]): JornadaParaLayout => ({
  trabaja: true,
  inicioMin: h(inicio),
  finMin: h(fin),
  pausa: pausa ? { inicioMin: h(pausa[0]), finMin: h(pausa[1]) } : null,
});
const turno = (fecha: string, barberId: string, inicio: string, dur: number) => ({
  fecha,
  barberId,
  inicioMin: h(inicio),
  duracionMin: dur,
});

const LUNES = "2026-10-12";
const SABADO = "2026-10-17";

// ── El caso del barbero: misma cantidad, días distintos ─────────────────────
{
  // 4 turnos de 45 minutos. Un lunes de 10 a 20 es poco; un sábado de 9 a 12
  // es el día completo. Por cantidad los dos eran "ámbar".
  const cuatro = (fecha: string, desde: string) =>
    [0, 45, 90, 135].map((m) => ({
      fecha,
      barberId: "a",
      inicioMin: h(desde) + m,
      duracionMin: 45,
    }));
  const r = ocupacionPorDia({
    barberIds: ["a"],
    jornadaDe: (_b, fecha) => (fecha === SABADO ? jornada("09:00", "12:00") : jornada("10:00", "20:00")),
    turnos: [...cuatro(LUNES, "10:00"), ...cuatro(SABADO, "09:00")],
    bloqueos: [],
  });
  check("4 turnos en un día de 10 horas: 30%", r[LUNES], 30);
  check("los mismos 4 en un sábado de 3 horas: 100%", r[SABADO], 100);
  check("el lunes tiene lugar", nivelDeOcupacion(r[LUNES]), "con-lugar");
  check("el sábado está lleno", nivelDeOcupacion(r[SABADO]), "lleno");
}

// ── Coincide con el "% ocupado" del calendario del día ──────────────────────
{
  const j = jornada("10:00", "19:00", ["13:00", "14:00"]);
  const turnos = [turno(LUNES, "a", "10:00", 60), turno(LUNES, "a", "15:00", 90)];
  const bloqueos = [{ fecha: LUNES, barberId: "a", inicioMin: h("18:00"), finMin: h("19:00") }];
  const delMes = ocupacionPorDia({ barberIds: ["a"], jornadaDe: () => j, turnos, bloqueos })[LUNES];
  const delDia = ocupacionDelDia(j, turnos, bloqueos);
  check("un barbero: el punto del mes y el número del día dicen lo mismo", delMes, delDia);
  // 9 h de jornada − 1 h de pausa − 1 h de bloqueo = 7 h; tomadas 2 h 30.
  check("y es 150 sobre 420 minutos: 36%", delMes, 36);
}

// ── Varios barberos: se suman minutos, no se promedian porcentajes ──────────
{
  // A trabaja 10 horas y tiene 1 tomada (10%). B trabaja 2 horas y las tiene
  // las 2 tomadas (100%). El promedio de porcentajes daría 55%; lo cierto es
  // que de 12 horas hay 3 tomadas: 25%.
  const r = ocupacionPorDia({
    barberIds: ["a", "b"],
    jornadaDe: (b) => (b === "a" ? jornada("10:00", "20:00") : jornada("10:00", "12:00")),
    turnos: [turno(LUNES, "a", "10:00", 60), turno(LUNES, "b", "10:00", 120)],
    bloqueos: [],
  });
  check("dos barberos con jornadas distintas: 3 de 12 horas", r[LUNES], 25);
}
{
  // Con el filtro en un barbero, solo cuenta el suyo.
  const base = {
    jornadaDe: () => jornada("10:00", "14:00"),
    turnos: [turno(LUNES, "a", "10:00", 240), turno(LUNES, "b", "10:00", 60)],
    bloqueos: [],
  };
  check("filtrado en A: lleno", ocupacionPorDia({ barberIds: ["a"], ...base })[LUNES], 100);
  check("filtrado en B: un cuarto", ocupacionPorDia({ barberIds: ["b"], ...base })[LUNES], 25);
  check("los dos juntos: 5 de 8 horas", ocupacionPorDia({ barberIds: ["a", "b"], ...base })[LUNES], 63);
  check(
    "un día donde solo tiene turnos el OTRO barbero no aparece",
    ocupacionPorDia({ barberIds: ["a"], ...base, turnos: [turno(LUNES, "b", "10:00", 60)] }),
    {},
  );
}

// ── Bordes ──────────────────────────────────────────────────────────────────
{
  const base = { barberIds: ["a"], bloqueos: [] };
  check(
    "sin turnos no hay días",
    ocupacionPorDia({ ...base, jornadaDe: () => jornada("10:00", "20:00"), turnos: [] }),
    {},
  );
  check(
    "encimados no cuentan doble",
    ocupacionPorDia({
      ...base,
      jornadaDe: () => jornada("10:00", "12:00"),
      turnos: [turno(LUNES, "a", "10:00", 60), turno(LUNES, "a", "10:30", 30)],
    })[LUNES],
    50,
  );
  check(
    "de franco pero con turnos cargados: ese rato está tomado",
    ocupacionPorDia({
      ...base,
      jornadaDe: () => null,
      turnos: [turno(LUNES, "a", "10:00", 30)],
    })[LUNES],
    100,
  );
  check(
    "el de franco con turnos no le baja el porcentaje al que sí trabaja",
    ocupacionPorDia({
      barberIds: ["a", "b"],
      bloqueos: [],
      jornadaDe: (b) => (b === "a" ? jornada("10:00", "12:00") : null),
      turnos: [turno(LUNES, "a", "10:00", 60), turno(LUNES, "b", "15:00", 60)],
    })[LUNES],
    67, // 60 + 60 tomados sobre 120 + 60 disponibles
  );
  check(
    "todo el día bloqueado y con un turno: no entra nadie",
    ocupacionPorDia({
      barberIds: ["a"],
      jornadaDe: () => jornada("10:00", "12:00"),
      turnos: [turno(LUNES, "a", "10:00", 30)],
      bloqueos: [{ fecha: LUNES, barberId: "a", inicioMin: h("10:00"), finMin: h("12:00") }],
    })[LUNES],
    100,
  );
  check(
    "un bloqueo de OTRO día no cuenta",
    ocupacionPorDia({
      barberIds: ["a"],
      jornadaDe: () => jornada("10:00", "12:00"),
      turnos: [turno(LUNES, "a", "10:00", 60)],
      bloqueos: [{ fecha: SABADO, barberId: "a", inicioMin: h("11:00"), finMin: h("12:00") }],
    })[LUNES],
    50,
  );
}

// ── Los cortes del color ────────────────────────────────────────────────────
check("0% hay lugar", nivelDeOcupacion(0), "con-lugar");
check("49% hay lugar", nivelDeOcupacion(49), "con-lugar");
check("50% ya es medio", nivelDeOcupacion(50), "medio");
check("84% sigue siendo medio", nivelDeOcupacion(84), "medio");
check("85% es lleno", nivelDeOcupacion(85), "lleno");
check("100% es lleno", nivelDeOcupacion(100), "lleno");

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
