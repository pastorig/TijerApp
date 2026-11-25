/**
 * Tests del modo liviano (feature 045).
 * Correr: node --experimental-strip-types scripts/test-rendimiento.ts
 */
import {
  combinar,
  DIAS_PARA_VOLVER_A_PROBAR,
  guardar,
  leerGuardado,
  nivelPorCuadros,
  nivelPorEquipo,
} from "../src/lib/rendimiento.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

// ─── Lo que informa el equipo ───────────────────────────────────────────────
check("equipo bueno", nivelPorEquipo({ memoriaGb: 8, nucleos: 8 }), 0);
check("sin datos (iPhone): normal hasta medir", nivelPorEquipo({ nucleos: 6 }), 0);
check("2 GB: liviano", nivelPorEquipo({ memoriaGb: 2, nucleos: 8 }), 1);
check("1 GB: muy liviano", nivelPorEquipo({ memoriaGb: 1, nucleos: 8 }), 2);
check("2 núcleos y 2 GB: muy liviano", nivelPorEquipo({ memoriaGb: 2, nucleos: 2 }), 2);
check("ahorro de datos prendido: liviano", nivelPorEquipo({ memoriaGb: 8, nucleos: 8, ahorroDeDatos: true }), 1);

// ─── Lo que se mide al scrollear ────────────────────────────────────────────
const cuadros = (ms: number, n = 60) => Array.from({ length: n }, () => ms);
check("60 fps parejos: normal", nivelPorCuadros(cuadros(16.7)), 0);
check("pocos cuadros: no decide", nivelPorCuadros(cuadros(50, 10)), null);
check("40 fps: liviano", nivelPorCuadros(cuadros(25)), 1);
check("25 fps: muy liviano", nivelPorCuadros(cuadros(40)), 2);
// 60 fps de promedio pero con saltos: 20% de cuadros de 50 ms.
const conSaltos = [...cuadros(16.7, 48), ...cuadros(50, 12)];
check("saltos seguidos aunque el promedio sea bueno: liviano", nivelPorCuadros(conSaltos), 1);
check("una pausa larga (pestaña oculta) no cuenta", nivelPorCuadros([...cuadros(16.7), 5000]), 0);

// ─── Nunca baja en la sesión ────────────────────────────────────────────────
check("sube de 0 a 1", combinar(0, 1), 1);
check("no baja de 2 a 0", combinar(2, 0), 2);
check("sin medición queda igual", combinar(1, null), 1);

// ─── Lo guardado ────────────────────────────────────────────────────────────
const ahora = Date.UTC(2026, 10, 25);
check("se lee lo guardado", leerGuardado(guardar(2, ahora), ahora + 86_400_000), 2);
check(
  "a los 7 días se vuelve a probar",
  leerGuardado(guardar(2, ahora), ahora + (DIAS_PARA_VOLVER_A_PROBAR + 1) * 86_400_000),
  null,
);
check("basura guardada: se ignora", leerGuardado("{roto", ahora), null);
check("nivel inválido: se ignora", leerGuardado(JSON.stringify({ nivel: 7, cuando: ahora }), ahora), null);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
