/**
 * Tests de "Horario y bloqueos" del Turnero (feature 042).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-ajustar-dia.ts
 */
import { cambioDeHorario, errorDeTramo, modoActual, textoDelHorario } from "../src/lib/ajustar-dia.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`}`);
  if (ok) passed++;
  else failed++;
}

const semana = { start_time: "09:00:00", end_time: "20:00:00", is_working: true };

check("sin excepción: normal", modoActual(null), "normal");
check("excepción trabajando: distinto", modoActual({ start_time: "10:00", end_time: "14:00", is_working: true }), "distinto");
check("excepción sin trabajar: no trabaja", modoActual({ start_time: "09:00", end_time: "18:00", is_working: false }), "franco");

check("texto del horario", textoDelHorario(semana), "09:00 a 20:00");
check("texto de franco", textoDelHorario({ ...semana, is_working: false }), "No trabaja");
check("texto sin horario", textoDelHorario(null), "Sin horario cargado");

check("tramo vacío", errorDeTramo("", "12:00"), "Completá desde y hasta.");
check("tramo al revés", errorDeTramo("14:00", "12:00"), "La hora de fin tiene que ser después de la de inicio.");
check("tramo igual", errorDeTramo("12:00", "12:00"), "La hora de fin tiene que ser después de la de inicio.");
check("tramo bien", errorDeTramo("10:00", "12:30"), null);

check("volver a normal borra la excepción", cambioDeHorario("normal", "", "", semana), { accion: "borrar" });
check("distinto guarda el tramo", cambioDeHorario("distinto", "10:00", "15:00", semana), { accion: "guardar", start: "10:00", end: "15:00", isWorking: true });
check("distinto con error no guarda", cambioDeHorario("distinto", "15:00", "10:00", semana), { error: "La hora de fin tiene que ser después de la de inicio." });
check("no trabaja usa el tramo de la semana", cambioDeHorario("franco", "", "", semana), { accion: "guardar", start: "09:00", end: "20:00", isWorking: false });
check("no trabaja sin horario semanal usa 09–18", cambioDeHorario("franco", "", "", null), { accion: "guardar", start: "09:00", end: "18:00", isWorking: false });

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
