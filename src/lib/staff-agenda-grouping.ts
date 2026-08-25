/**
 * Partir el día del barbero en mañana y tarde.
 *
 * ── Por qué el corte es a las 13:00 ─────────────────────────────────────────
 * No a las 12. Un turno de 12:30 se siente "mediodía", y llamarlo "Tarde"
 * suena raro; llamarlo "Mañana" no molesta a nadie. En una barbería argentina
 * la tarde arranca después de comer.
 *
 * ── Por qué a veces NO se agrupa ────────────────────────────────────────────
 * Si todos los turnos caen en la misma franja, los encabezados no ordenan
 * nada: queda un solo "Tarde" arriba de la lista entera, que es ruido puro. El
 * agrupado sirve cuando hay algo que separar, así que se muestra solo ahí.
 */

const CORTE_TARDE_MINUTOS = 13 * 60;

export type ConHorario = { appointment_time: string };

export function minutosDelTurno(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function esDeManana(hhmm: string): boolean {
  return minutosDelTurno(hhmm) < CORTE_TARDE_MINUTOS;
}

export type Franjas<T> =
  /** Hay turnos en las dos mitades: se muestran separadas. */
  | { agrupar: true; manana: T[]; tarde: T[] }
  /** Todos en la misma mitad (o ninguno): va una lista sola, sin encabezados. */
  | { agrupar: false; turnos: T[] };

export function agruparPorFranja<T extends ConHorario>(turnos: T[]): Franjas<T> {
  const manana = turnos.filter((t) => esDeManana(t.appointment_time));
  const tarde = turnos.filter((t) => !esDeManana(t.appointment_time));

  if (manana.length === 0 || tarde.length === 0) {
    return { agrupar: false, turnos };
  }
  return { agrupar: true, manana, tarde };
}
