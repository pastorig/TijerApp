/**
 * El modo liviano del celular (feature 045): la app se da cuenta sola de que el
 * equipo no da abasto y apaga lo que traba.
 *
 * Dos fuentes:
 * 1. Lo que el equipo dice de sí mismo al cargar (memoria, núcleos, ahorro de
 *    datos). Es rápido pero incompleto: el iPhone no informa la memoria, y un
 *    Android barato con 8 núcleos lentos se presenta como bueno.
 * 2. Lo que se MIDE mientras se usa: cuánto tarda cada cuadro al scrollear.
 *    Es lo que de verdad dice si la placa llega con el vidrio. Esto es lo que
 *    decide.
 *
 * El nivel solo sube dentro de la sesión (no titila) y se guarda: la próxima vez
 * arranca liviano de entrada. A los 7 días se vuelve a probar desde cero, por
 * si fue un mal momento del equipo (batería baja, otra app pesada).
 *
 * Niveles: 0 normal · 1 liviano · 2 muy liviano.
 */

export type Nivel = 0 | 1 | 2;

export const CLAVE_NIVEL = "tj-nivel-equipo";
export const DIAS_PARA_VOLVER_A_PROBAR = 7;

/** Lo que el equipo informa al cargar. */
export function nivelPorEquipo(input: {
  memoriaGb?: number;
  nucleos?: number;
  ahorroDeDatos?: boolean;
}): Nivel {
  const { memoriaGb, nucleos, ahorroDeDatos } = input;
  if (
    (memoriaGb !== undefined && memoriaGb <= 1) ||
    (nucleos !== undefined && nucleos <= 2 && memoriaGb !== undefined && memoriaGb <= 2)
  ) {
    return 2;
  }
  if (
    (memoriaGb !== undefined && memoriaGb <= 2) ||
    (nucleos !== undefined && nucleos <= 2) ||
    ahorroDeDatos === true
  ) {
    return 1;
  }
  return 0;
}

/**
 * Qué dicen los cuadros medidos mientras se scrollea (en ms entre cuadro y
 * cuadro). A 60 fps cada cuadro dura ~16,7 ms; uno de más de 34 ms es un
 * salto que se ve. Con menos de 20 cuadros no se decide nada.
 */
export function nivelPorCuadros(deltasMs: number[]): Nivel | null {
  const validos = deltasMs.filter((d) => d > 0 && d < 1000);
  if (validos.length < 20) return null;
  const promedio = validos.reduce((a, b) => a + b, 0) / validos.length;
  const fps = 1000 / promedio;
  const saltos = validos.filter((d) => d > 34).length / validos.length;
  if (fps < 30 || saltos > 0.35) return 2;
  if (fps < 48 || saltos > 0.15) return 1;
  return 0;
}

/** El nivel nunca baja dentro de la sesión: solo sube. */
export function combinar(actual: Nivel, nuevo: Nivel | null): Nivel {
  if (nuevo === null) return actual;
  return (Math.max(actual, nuevo) as Nivel);
}

/** Lo guardado: el nivel y cuándo se midió. Vencido o roto → null. */
export function leerGuardado(raw: string | null, ahora: number): Nivel | null {
  if (!raw) return null;
  try {
    const { nivel, cuando } = JSON.parse(raw) as { nivel?: unknown; cuando?: unknown };
    if (nivel !== 0 && nivel !== 1 && nivel !== 2) return null;
    if (typeof cuando !== "number") return null;
    if (ahora - cuando > DIAS_PARA_VOLVER_A_PROBAR * 86_400_000) return null;
    return nivel;
  } catch {
    return null;
  }
}

export function guardar(nivel: Nivel, ahora: number): string {
  return JSON.stringify({ nivel, cuando: ahora });
}

/**
 * El mismo arranque como script para el <head>: aplica el nivel guardado ANTES
 * de dibujar, así un celular flojo no arranca con todo prendido y recién
 * después se aliviana (se vería un salto).
 */
export const NIVEL_TEMPRANO = `try{var r=localStorage.getItem("${CLAVE_NIVEL}");if(r){var g=JSON.parse(r);if(g&&(g.nivel===1||g.nivel===2)&&Date.now()-g.cuando<${DIAS_PARA_VOLVER_A_PROBAR}*864e5){document.documentElement.classList.add(g.nivel===2?"tj-muy-lento":"tj-lento")}}}catch(e){}`;
