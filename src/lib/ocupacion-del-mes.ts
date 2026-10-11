import { minutosDelDia, type JornadaParaLayout } from "@/lib/agenda-layout";

/**
 * Qué tan ocupado está cada día, para el punto del calendario del mes.
 *
 * ── De dónde sale ───────────────────────────────────────────────────────────
 * El punto se pintaba por CANTIDAD de turnos, con cortes fijos: verde hasta 3,
 * ámbar hasta 6, rojo de 7 en adelante. Lo marcó un barbero: esa cuenta no dice
 * lo mismo en todas las barberías. Uno que corta cada 45 minutos está lleno con
 * 8 turnos y casi nunca veía rojo; una barbería con tres barberos pasaba los 7
 * a media mañana y veía todo el mes en rojo; un sábado de medio día completo se
 * veía "tranquilo".
 *
 * Lo que se quiere saber mirando el mes es si ese día entra alguien más, y eso
 * lo contesta la ocupación: minutos tomados sobre minutos que se atiende.
 *
 * Es la MISMA cuenta que el "% ocupado" del calendario del día
 * (`minutosDelDia`), así que el punto del mes y el número del día no pueden
 * decir cosas distintas.
 */

export type TurnoDelMes = {
  fecha: string;
  barberId: string;
  inicioMin: number;
  duracionMin: number;
};

export type BloqueoDelMes = {
  fecha: string;
  barberId: string;
  inicioMin: number;
  finMin: number;
};

/** Minutos que cubren los turnos, sin contar dos veces los encimados. */
function minutosCubiertos(turnos: Array<{ inicioMin: number; duracionMin: number }>): number {
  const tramos = turnos
    .map((t) => ({ inicio: t.inicioMin, fin: t.inicioMin + t.duracionMin }))
    .filter((t) => t.fin > t.inicio)
    .sort((a, b) => a.inicio - b.inicio);
  let total = 0;
  let cursor = -Infinity;
  for (const t of tramos) {
    const desde = Math.max(t.inicio, cursor);
    if (t.fin > desde) total += t.fin - desde;
    cursor = Math.max(cursor, t.fin);
  }
  return total;
}

/**
 * Porcentaje ocupado (0 a 100) de cada día que tiene al menos un turno.
 *
 * Con varios barberos se SUMAN minutos y se divide al final: promediar
 * porcentajes haría pesar igual al que trabaja 4 horas que al que trabaja 10.
 *
 * Los días sin turnos no aparecen: el calendario no les dibuja punto.
 */
export function ocupacionPorDia(params: {
  barberIds: string[];
  /** La jornada de ese barbero ese día, ya resuelta. `null` si no trabaja. */
  jornadaDe: (barberId: string, fecha: string) => JornadaParaLayout | null;
  turnos: TurnoDelMes[];
  bloqueos: BloqueoDelMes[];
}): Record<string, number> {
  const { barberIds, jornadaDe, turnos, bloqueos } = params;
  const deLaLista = new Set(barberIds);

  const turnosPorDia = new Map<string, TurnoDelMes[]>();
  for (const t of turnos) {
    if (!deLaLista.has(t.barberId)) continue;
    const lista = turnosPorDia.get(t.fecha);
    if (lista) lista.push(t);
    else turnosPorDia.set(t.fecha, [t]);
  }

  const resultado: Record<string, number> = {};
  for (const [fecha, turnosDelDia] of turnosPorDia) {
    let disponible = 0;
    let ocupado = 0;
    for (const barberId of barberIds) {
      const suyos = turnosDelDia.filter((t) => t.barberId === barberId);
      const minutos = minutosDelDia(
        jornadaDe(barberId, fecha),
        suyos,
        bloqueos.filter((b) => b.fecha === fecha && b.barberId === barberId),
      );
      if (minutos) {
        disponible += minutos.disponible;
        ocupado += minutos.ocupado;
      } else if (suyos.length > 0) {
        // De franco pero con turnos cargados: ese rato lo trabaja y lo tiene
        // tomado. Cuenta de los dos lados.
        const cubiertos = minutosCubiertos(suyos);
        disponible += cubiertos;
        ocupado += cubiertos;
      }
    }
    // Hay turnos pero ningún minuto disponible (todo bloqueado): no entra nadie.
    resultado[fecha] =
      disponible <= 0
        ? 100
        : Math.round(Math.min(100, Math.max(0, (ocupado / disponible) * 100)));
  }
  return resultado;
}

export type NivelDeOcupacion = "con-lugar" | "medio" | "lleno";

/** Hasta la mitad hay lugar de sobra; de 85% para arriba ya no entra casi nadie. */
export function nivelDeOcupacion(porcentaje: number): NivelDeOcupacion {
  if (porcentaje >= 85) return "lleno";
  if (porcentaje >= 50) return "medio";
  return "con-lugar";
}
