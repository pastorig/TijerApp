/**
 * El sobreturno que carga un empleado (feature 032).
 *
 * Un sobreturno es un turno corto metido a propósito en un rato libre o encima
 * de otro. Para el dueño lo arma el navegador contra Supabase; el empleado pasa
 * por el servidor, y esta es la parte de esa validación que no toca la base.
 *
 * ── Qué decide el servidor y qué el empleado ────────────────────────────────
 * El empleado elige cuánto dura (de una lista corta) y, si quiere, el servicio.
 * El precio NUNCA: sale del servicio en la base, y sin servicio es cero. Si la
 * duración fuera libre, un "sobreturno" de 8 horas sería una forma de bloquear
 * el día entero sin el permiso de bloquear.
 */

/** Las duraciones que se ofrecen, en minutos. Las mismas que ve el dueño. */
export const DURACIONES_SOBRETURNO = [10, 15, 20, 30] as const;

export const DURACION_SOBRETURNO_POR_DEFECTO = 15;

export const NOMBRE_SOBRETURNO_SIN_SERVICIO = "Sobreturno";

export type PedidoDeSobreturno =
  | { esSobreturno: false }
  | { esSobreturno: true; duracion: number }
  | { esSobreturno: true; error: string };

/** Lee `sobreturno` y `duracion` del body de un pedido. */
export function leerSobreturno(body: Record<string, unknown>): PedidoDeSobreturno {
  // Solo `true` lo prende. Un "true" en texto o un 1 no: que un cliente viejo
  // o un body mal armado no convierta un turno común en uno que se saltea el
  // índice de horario único.
  if (body.sobreturno !== true) return { esSobreturno: false };

  if (body.duracion === undefined || body.duracion === null) {
    return { esSobreturno: true, duracion: DURACION_SOBRETURNO_POR_DEFECTO };
  }
  const duracion = body.duracion;
  if (
    typeof duracion !== "number" ||
    !(DURACIONES_SOBRETURNO as readonly number[]).includes(duracion)
  ) {
    return {
      esSobreturno: true,
      error: `Un sobreturno dura ${DURACIONES_SOBRETURNO.join(", ")} minutos.`,
    };
  }
  return { esSobreturno: true, duracion };
}
