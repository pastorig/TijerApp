/**
 * Cada cuántos minutos se acomodan los turnos en el calendario de la agenda:
 * dónde se puede soltar uno al arrastrarlo y a qué horas se puede cargar.
 *
 * Se guarda en `slot_interval_minutes` de la barbería. Esa columna fue el
 * "intervalo de turnos" de la reserva hasta julio de 2026; desde entonces la
 * reserva sigue la duración de cada servicio y la columna solo quedaba como
 * duración de respaldo para turnos sin duración (al 21/10/2026 no hay
 * ninguno: todos los caminos que crean turnos la guardan).
 *
 * ── De dónde sale ───────────────────────────────────────────────────────────
 * SV Barber la tenía en 40 con cortes de 30 y no la podía cambiar: el
 * calendario solo dejaba poner turnos a las 15:00, 15:40, 16:20… y entre corte
 * y corte quedaban 10 minutos muertos.
 */
export const PASOS_DE_AGENDA = [10, 15, 20, 30] as const;

/** Con 10 entra cualquier duración que se usa hoy (25, 30, 35, 40, 45). */
export const PASO_DE_AGENDA_POR_DEFECTO = 10;

/**
 * El paso que usa el calendario. Un valor viejo que no está en la lista (40,
 * 45) cae a 10: era justamente el que trababa la agenda.
 */
export function pasoDeAgenda(valorGuardado: number | null | undefined): number {
  return (PASOS_DE_AGENDA as readonly number[]).includes(Number(valorGuardado))
    ? Number(valorGuardado)
    : PASO_DE_AGENDA_POR_DEFECTO;
}
