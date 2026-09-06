/**
 * Los rangos de fechas de Reportes: qué días entran en "hoy", "esta semana" y
 * "este mes", y contra qué se comparan.
 *
 * ── Por qué es un módulo aparte ─────────────────────────────────────────────
 * Vivía adentro del componente y no había forma de testearlo sin renderizar.
 * Es la clase de lógica que se rompe sin que nadie lo note: el barbero ve un
 * número raro y no tiene cómo saber qué días se contaron.
 */

export type PeriodKey = "today" | "week" | "month";

export type DateRange = {
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD */
  end: string;
  /** Días que abarca, contando las dos puntas. Es el divisor de los promedios. */
  days: number;
};

const MS_POR_DIA = 86_400_000;

function aYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Días entre dos fechas, contando las dos puntas.
 *
 * Normaliza a medianoche a propósito: si una punta viene al mediodía y la otra
 * a las 00:00, la resta da días y medio y el redondeo agrega uno. Así el
 * contador de días —que es el divisor de todos los promedios— salía uno de más
 * según a qué hora se hubiera construido la fecha.
 */
function diasEntre(desde: Date, hasta: Date): number {
  const a = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b.getTime() - a.getTime()) / MS_POR_DIA) + 1;
}

/** El lunes de la semana de esa fecha. */
export function inicioDeSemana(fecha: Date): Date {
  const d = new Date(fecha);
  const dia = d.getDay(); // 0 = domingo
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia));
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * El período que se está mirando, CORTADO EN HOY.
 *
 * Antes el rango era el mes o la semana completos, con los días que todavía no
 * pasaron adentro. SV Barber lo notó porque al sexto día de septiembre su mes
 * mostraba 59 turnos y su semana 47: los 12 de diferencia eran turnos ya
 * reservados para más adelante. Dos números que deberían contar lo mismo
 * contaban cosas distintas, y ninguno respondía "cómo vengo".
 *
 * Un reporte mira lo que pasó; lo que viene agendado se ve en la Agenda.
 */
export function rangoDelPeriodo(periodo: PeriodKey, hoy: Date): DateRange {
  if (periodo === "today") {
    const ymd = aYmd(hoy);
    return { start: ymd, end: ymd, days: 1 };
  }
  const inicio =
    periodo === "week"
      ? inicioDeSemana(hoy)
      : new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { start: aYmd(inicio), end: aYmd(hoy), days: diasEntre(inicio, hoy) };
}

/**
 * El período anterior, con la MISMA cantidad de días que el actual.
 *
 * Comparaba un mes a medio andar contra el mes anterior entero: el 6 de
 * septiembre, seis días de trabajo contra los treinta y uno de agosto. El
 * "vs anterior" mostraba una caída inventada. Ahora son seis contra seis.
 */
export function rangoAnterior(
  periodo: PeriodKey,
  diasDelActual: number,
  hoy: Date,
): DateRange {
  const inicio =
    periodo === "today"
      ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1)
      : periodo === "week"
        ? new Date(inicioDeSemana(hoy).getTime() - 7 * MS_POR_DIA)
        : new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);

  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + diasDelActual - 1);

  // El mes anterior puede ser más corto: el 31 de marzo no existe en febrero.
  // Sin este recorte, "el mes pasado" se comía días de marzo.
  if (periodo === "month") {
    const ultimoDelMes = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
    if (fin > ultimoDelMes) {
      return {
        start: aYmd(inicio),
        end: aYmd(ultimoDelMes),
        days: diasEntre(inicio, ultimoDelMes),
      };
    }
  }
  return { start: aYmd(inicio), end: aYmd(fin), days: diasDelActual };
}
