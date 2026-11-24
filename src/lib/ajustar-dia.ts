/**
 * Lógica pura de "Horario y bloqueos" del Turnero (feature 042): qué modo tiene
 * un día y cómo se valida lo que el barbero carga. Testeable sin base.
 */

export type ModoDelDia = "normal" | "distinto" | "franco";

export type HorarioSemanal = { start_time: string; end_time: string; is_working: boolean } | null;
export type Excepcion = { start_time: string; end_time: string; is_working: boolean } | null;

export const hhmm = (t: string | null | undefined) => (t ?? "").slice(0, 5);

/** El modo que se muestra al abrir: sale de la excepción del día, si hay. */
export function modoActual(excepcion: Excepcion): ModoDelDia {
  if (!excepcion) return "normal";
  return excepcion.is_working ? "distinto" : "franco";
}

/** "09:00 a 20:00", "No trabaja" o "Sin horario cargado". */
export function textoDelHorario(h: HorarioSemanal): string {
  if (!h) return "Sin horario cargado";
  if (!h.is_working) return "No trabaja";
  return `${hhmm(h.start_time)} a ${hhmm(h.end_time)}`;
}

/** Un tramo desde/hasta válido: las dos horas y la de fin después. */
export function errorDeTramo(desde: string, hasta: string): string | null {
  if (!/^\d{2}:\d{2}$/.test(desde) || !/^\d{2}:\d{2}$/.test(hasta)) return "Completá desde y hasta.";
  if (hasta <= desde) return "La hora de fin tiene que ser después de la de inicio.";
  return null;
}

/**
 * Qué se escribe al guardar el horario del día. Para "No trabaja" la tabla
 * igual pide un tramo válido: se guarda el de la semana (o 09–18) con
 * `is_working: false`.
 */
export function cambioDeHorario(
  modo: ModoDelDia,
  desde: string,
  hasta: string,
  semanal: HorarioSemanal,
): { accion: "borrar" } | { accion: "guardar"; start: string; end: string; isWorking: boolean } | { error: string } {
  if (modo === "normal") return { accion: "borrar" };
  if (modo === "franco") {
    const start = semanal?.is_working ? hhmm(semanal.start_time) : "09:00";
    const end = semanal?.is_working ? hhmm(semanal.end_time) : "18:00";
    return { accion: "guardar", start, end, isWorking: false };
  }
  const error = errorDeTramo(desde, hasta);
  if (error) return { error };
  return { accion: "guardar", start: desde, end: hasta, isWorking: true };
}
