/**
 * Qué motivo se guarda cuando el empleado cambia el estado de un turno.
 *
 * ── Por qué esto es una función y no dos líneas en el endpoint ──────────────
 * Porque de este campo depende algo que no se ve: la detección de clientes
 * ghost en la pantalla del dueño sale de `cancellation_reason`. Un motivo que
 * se pierde, o que queda pegado en un turno confirmado, no rompe nada visible
 * — ensucia un reporte que alguien mira dos meses después. Es exactamente la
 * clase de regla que conviene tener escrita y con tests.
 */

/** Tope del texto libre. Es una nota, no un descargo. */
export const MAX_MOTIVO = 300;

export function motivoParaGuardar(
  status: "confirmed" | "cancelled",
  crudo: unknown,
): string | null {
  // Un turno confirmado con un motivo de cancelación pegado es basura que
  // después alguien lee como si significara algo.
  if (status !== "cancelled") return null;
  if (typeof crudo !== "string") return null;

  const limpio = crudo.trim().slice(0, MAX_MOTIVO).trim();
  // Cadena vacía → null y no "": en la base el "sin motivo" ya se representa
  // con null, y tener las dos formas obliga a chequear las dos para siempre.
  return limpio.length > 0 ? limpio : null;
}
