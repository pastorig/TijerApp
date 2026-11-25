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

// ── Períodos anteriores (feature 043) ─────────────────────────────────────────
// "Atrás" es cuántos períodos del mismo tipo se retrocede desde el actual:
// 0 = el que está en curso (cortado en hoy, como siempre), 1 = el anterior
// (ayer, la semana pasada, el mes pasado), y así. Un período que ya terminó se
// cuenta ENTERO y se compara contra el anterior ENTERO.

/** Hasta dónde se puede ir para atrás: 24 meses en cualquiera de los tres. */
export const MAX_ATRAS: Record<PeriodKey, number> = {
  today: 730,
  week: 104,
  month: 24,
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** El período completo (sin cortar en hoy), `atras` lugares antes del actual. */
function rangoCompleto(periodo: PeriodKey, hoy: Date, atras: number): DateRange {
  if (periodo === "today") {
    const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - atras);
    return { start: aYmd(dia), end: aYmd(dia), days: 1 };
  }
  if (periodo === "week") {
    const lunes = inicioDeSemana(hoy);
    const inicio = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7 * atras);
    const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
    return { start: aYmd(inicio), end: aYmd(fin), days: 7 };
  }
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1);
  const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
  return { start: aYmd(inicio), end: aYmd(fin), days: diasEntre(inicio, fin) };
}

function acotarAtras(periodo: PeriodKey, atras: number): number {
  return Math.min(Math.max(0, Math.trunc(atras)), MAX_ATRAS[periodo]);
}

/** Lo que se cuenta: el período en curso hasta hoy, o uno ya terminado entero. */
export function rangoMirado(periodo: PeriodKey, hoy: Date, atras: number): DateRange {
  const n = acotarAtras(periodo, atras);
  return n === 0 ? rangoDelPeriodo(periodo, hoy) : rangoCompleto(periodo, hoy, n);
}

/** Contra qué se compara lo que se está mirando. */
export function rangoDeComparacion(periodo: PeriodKey, hoy: Date, atras: number): DateRange {
  const n = acotarAtras(periodo, atras);
  if (n === 0) return rangoAnterior(periodo, rangoDelPeriodo(periodo, hoy).days, hoy);
  return rangoCompleto(periodo, hoy, n + 1);
}

/**
 * Cómo se llama el período para el dueño: "Este mes" / "Octubre 2026",
 * "Esta semana" / "Semana pasada" / "17 – 23 nov", "Hoy" / "Ayer" / "lunes 24/11".
 */
export function nombreDelPeriodo(periodo: PeriodKey, hoy: Date, atras: number): string {
  const n = acotarAtras(periodo, atras);
  const r = rangoCompleto(periodo, hoy, n);
  const [y, m, d] = r.start.split("-").map(Number);
  if (periodo === "today") {
    if (n === 0) return "Hoy";
    if (n === 1) return "Ayer";
    const dia = new Date(y, m - 1, d);
    return `${DIAS[dia.getDay()]} ${d}/${m}${y !== hoy.getFullYear() ? `/${y}` : ""}`;
  }
  if (periodo === "week") {
    if (n === 0) return "Esta semana";
    if (n === 1) return "Semana pasada";
    const [y2, m2, d2] = r.end.split("-").map(Number);
    const anio = y2 !== hoy.getFullYear() ? ` ${y2}` : "";
    return m === m2
      ? `${d} – ${d2} ${MESES_CORTOS[m2 - 1]}${anio}`
      : `${d} ${MESES_CORTOS[m - 1]} – ${d2} ${MESES_CORTOS[m2 - 1]}${anio}`;
  }
  if (n === 0) return "Este mes";
  const nombre = MESES[m - 1];
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${y}`;
}
