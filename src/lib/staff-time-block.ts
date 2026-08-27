/**
 * Las reglas del bloqueo de horario que carga el empleado (feature 023).
 *
 * Están acá y no adentro del endpoint porque son comparaciones de horarios, y
 * ahí es donde se cuelan los errores de borde: el rango invertido, el de
 * duración cero, el "24:00". Ninguno rompe nada visible — el bloqueo se crea y
 * simplemente no tapa lo que debería, o tapa de más.
 */

/** "HH:MM" o "HH:MM:SS" → minutos desde medianoche. `null` si no es una hora. */
export function aMinutos(hhmm: unknown): number | null {
  if (typeof hhmm !== "string") return null;
  const m = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export type RangoValido =
  | { ok: true; desde: string; hasta: string }
  | { ok: false; error: string };

/**
 * Valida el rango del bloqueo y lo normaliza a "HH:MM".
 *
 * No se permite el rango de duración cero: un bloqueo que no tapa nada es un
 * registro que después alguien mira sin entender por qué está.
 */
export function validarRango(desde: unknown, hasta: unknown): RangoValido {
  const d = aMinutos(desde);
  const h = aMinutos(hasta);

  if (d === null || h === null) {
    return { ok: false, error: "Poné un horario de inicio y uno de fin." };
  }
  if (h <= d) {
    return { ok: false, error: "El horario de fin tiene que ser posterior al de inicio." };
  }

  const fmt = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  return { ok: true, desde: fmt(d), hasta: fmt(h) };
}

export type TurnoParaSolapar = {
  appointment_time: string;
  service_duration_minutes?: number | null;
  status: string;
};

/** Duración que se le asume a un turno que no la tiene cargada. */
const DURACION_POR_DEFECTO = 30;

/**
 * Cuántos turnos activos quedan pisados por el bloqueo.
 *
 * **Bloquear no cancela turnos**, a propósito: cancelarle a un cliente es una
 * decisión, no un efecto secundario de marcar que te vas antes. Pero el barbero
 * tiene que enterarse de que esos turnos siguen en pie, así que se cuentan y se
 * le dicen.
 *
 * Se cuenta el solapamiento real, no solo la hora de inicio: un turno de 16:45
 * que dura 45 minutos entra en un bloqueo que arranca a las 17.
 */
export function turnosEnRango(
  turnos: TurnoParaSolapar[],
  desde: string,
  hasta: string,
): number {
  const d = aMinutos(desde);
  const h = aMinutos(hasta);
  if (d === null || h === null) return 0;

  return turnos.filter((t) => {
    if (t.status !== "confirmed" && t.status !== "pending") return false;
    const inicio = aMinutos(t.appointment_time);
    if (inicio === null) return false;
    const fin =
      inicio +
      (t.service_duration_minutes && t.service_duration_minutes > 0
        ? t.service_duration_minutes
        : DURACION_POR_DEFECTO);
    return inicio < h && fin > d;
  }).length;
}
