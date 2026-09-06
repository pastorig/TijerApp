/**
 * Cómo es el día de un barbero en una fecha.
 *
 * ── Por qué esto vive solo ──────────────────────────────────────────────────
 * Esta pregunta tiene UNA respuesta y la contesta esta función. Antes vivía
 * escrita adentro de `buildAvailabilitySlots`, mezclada con el armado de la
 * grilla y el filtrado de turnos ocupados, y ese amontonamiento es de donde
 * salen los bugs de horario: en septiembre de 2026 salieron dos en la misma
 * semana, los dos en código que hacía dos cosas a la vez.
 *
 * ── Lo que esta función NO hace, a propósito ────────────────────────────────
 * No mira turnos tomados ni bloqueos: eso tapa ratos ADENTRO de la jornada,
 * después. No sabe qué hora es: "ya pasó" y "falta muy poco" se aplican encima.
 * No arma la grilla ni sabe cuánto dura un servicio. No toca la base.
 *
 * Si aparece una regla que no entra en la precedencia de abajo, es señal de que
 * algo se está mezclando.
 */

/** El horario de un día, venga de donde venga. */
export type JornadaDelDia = {
  trabaja: boolean;
  /** "HH:MM". Sin sentido si `trabaja` es false. */
  inicio: string;
  /** "HH:MM". Sin sentido si `trabaja` es false. */
  fin: string;
  pausa: { inicio: string; fin: string } | null;
  /** Quién decidió. Sirve para explicarlo en pantalla y para debuggear. */
  origen: "excepcion" | "regla-semanal" | "horario-barberia";
};

export type ReglaSemanalDelDia = {
  startTime: string;
  endTime: string;
  isWorking: boolean;
  breakStart: string | null;
  breakEnd: string | null;
};

export type ExcepcionDelDia = {
  startTime: string;
  endTime: string;
  isWorking: boolean;
  /** true = la pausa sale de la regla semanal. Es el default de la columna. */
  heredaPausa: boolean;
  breakStart: string | null;
  breakEnd: string | null;
};

export type EntradaJornada = {
  reglaSemanal: ReglaSemanalDelDia | null;
  /** La excepción de ESA fecha, si existe y no está borrada. */
  excepcion: ExcepcionDelDia | null;
  /** El respaldo cuando el barbero no tiene regla propia para ese día. */
  horarioBarberia: { start: string; end: string };
};

/** "09:00:00" y "09:00" son lo mismo; adentro se trabaja con "HH:MM". */
function aHoraCorta(valor: string): string {
  return valor.slice(0, 5);
}

function armarPausa(
  inicio: string | null,
  fin: string | null,
): { inicio: string; fin: string } | null {
  if (!inicio || !fin) return null;
  return { inicio: aHoraCorta(inicio), fin: aHoraCorta(fin) };
}

/**
 * La precedencia, de más fuerte a más débil:
 *
 *   1. Excepción de la fecha
 *   2. Regla semanal del barbero  (y SIEMPRE aporta la pausa, salvo que la
 *                                  excepción defina la suya)
 *   3. Horario general de la barbería
 */
export function resolverJornadaDelDia(entrada: EntradaJornada): JornadaDelDia {
  const { reglaSemanal, excepcion, horarioBarberia } = entrada;

  if (excepcion) {
    // La pausa se HEREDA salvo que la excepción diga lo contrario. Sin esto, un
    // barbero con almuerzo de 13 a 16 queda con esas tres horas a la venta
    // cualquier día que tenga excepción — pasó de verdad, dos veces.
    const pausa = excepcion.heredaPausa
      ? armarPausa(reglaSemanal?.breakStart ?? null, reglaSemanal?.breakEnd ?? null)
      : armarPausa(excepcion.breakStart, excepcion.breakEnd);

    return {
      trabaja: excepcion.isWorking,
      inicio: aHoraCorta(excepcion.startTime),
      fin: aHoraCorta(excepcion.endTime),
      pausa,
      origen: "excepcion",
    };
  }

  if (reglaSemanal) {
    return {
      trabaja: reglaSemanal.isWorking,
      inicio: aHoraCorta(reglaSemanal.startTime),
      fin: aHoraCorta(reglaSemanal.endTime),
      pausa: armarPausa(reglaSemanal.breakStart, reglaSemanal.breakEnd),
      origen: "regla-semanal",
    };
  }

  return {
    trabaja: true,
    inicio: aHoraCorta(horarioBarberia.start),
    fin: aHoraCorta(horarioBarberia.end),
    pausa: null,
    origen: "horario-barberia",
  };
}

// ─── Turnos que quedan afuera ────────────────────────────────────────────────

export type TurnoParaChequear = {
  /** "HH:MM" o "HH:MM:SS". */
  hora: string;
  duracionMinutos: number;
  cliente: string;
};

export type TurnoFuera = TurnoParaChequear & {
  motivo: "dia-cerrado" | "antes" | "despues" | "en-pausa";
};

function aMinutos(hora: string): number {
  const [h, m] = aHoraCorta(hora).split(":").map(Number);
  return h * 60 + m;
}

/**
 * Los turnos que no entran en una jornada. Es el aviso de "ojo, si guardás esto
 * te quedan estos turnos afuera".
 *
 * Cuenta con el mismo criterio que la grilla: un turno que empieza adentro pero
 * TERMINA afuera del cierre está afuera. Si contara distinto, el aviso mentiría
 * justo cuando más se lo mira.
 */
export function turnosFueraDeJornada(
  turnos: TurnoParaChequear[],
  jornada: JornadaDelDia,
): TurnoFuera[] {
  if (!jornada.trabaja) {
    return turnos.map((t) => ({ ...t, motivo: "dia-cerrado" as const }));
  }

  const inicio = aMinutos(jornada.inicio);
  const fin = aMinutos(jornada.fin);
  const pausa = jornada.pausa
    ? { inicio: aMinutos(jornada.pausa.inicio), fin: aMinutos(jornada.pausa.fin) }
    : null;

  const fuera: TurnoFuera[] = [];
  for (const turno of turnos) {
    const arranca = aMinutos(turno.hora);
    const termina = arranca + turno.duracionMinutos;

    if (arranca < inicio) {
      fuera.push({ ...turno, motivo: "antes" });
      continue;
    }
    if (termina > fin) {
      fuera.push({ ...turno, motivo: "despues" });
      continue;
    }
    if (pausa && arranca < pausa.fin && termina > pausa.inicio) {
      fuera.push({ ...turno, motivo: "en-pausa" });
    }
  }
  return fuera;
}
