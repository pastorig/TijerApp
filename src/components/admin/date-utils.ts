/**
 * Helpers de fechas para la agenda del admin.
 *
 * Todas las funciones trabajan con "YYYY-MM-DD" como representación canónica
 * de día (string), y construyen Date al mediodía local para evitar bugs de
 * timezone al cruzar a UTC.
 */

const WEEKDAY_LABELS_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

const MONTH_LABELS_LONG = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const WEEKDAY_LABELS_SHORT = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const;

/** Etiquetas en MAYÚSCULAS sin tilde — para "stamps" de fecha tipo calendario. */
export const WEEKDAY_LABELS_STAMP = [
  "DOM",
  "LUN",
  "MAR",
  "MIE",
  "JUE",
  "VIE",
  "SAB",
] as const;

export const MONTH_LABELS_STAMP = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
] as const;

export function getStampParts(ymd: string): {
  weekday: string;
  day: string;
  month: string;
} {
  const date = parseYmd(ymd);
  return {
    weekday: WEEKDAY_LABELS_STAMP[date.getDay()],
    day: String(date.getDate()).padStart(2, "0"),
    month: MONTH_LABELS_STAMP[date.getMonth()],
  };
}

/** "YYYY-MM-DD" → Date at local noon. */
export function parseYmd(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** Date → "YYYY-MM-DD" en zona local. */
export function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayYmd(): string {
  return toYmd(new Date());
}

/** Devuelve los 7 días de la semana ISO (Lun→Dom) que contiene `focusDate`. */
export function getWeekDays(focusDate: string): string[] {
  const focus = parseYmd(focusDate);
  // JS getDay(): 0=Dom, 1=Lun ... 6=Sáb. Queremos semana arrancando en lunes.
  const offsetToMonday = (focus.getDay() + 6) % 7;
  const monday = new Date(focus);
  monday.setDate(focus.getDate() - offsetToMonday);

  const days: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(toYmd(day));
  }
  return days;
}

/** Grilla 6 semanas × 7 días del mes especificado (mes 0-indexed). */
export function getMonthGrid(
  year: number,
  month: number,
): Array<{ ymd: string; day: number; inCurrentMonth: boolean }> {
  const firstOfMonth = new Date(year, month, 1);
  const jsDay = firstOfMonth.getDay();
  const padBefore = (jsDay + 6) % 7;

  const grid: Array<{ ymd: string; day: number; inCurrentMonth: boolean }> = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(year, month, 1 - padBefore + i, 12, 0, 0);
    grid.push({
      ymd: toYmd(date),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
    });
  }
  return grid;
}

export function formatMonthYear(date: Date): string {
  return `${MONTH_LABELS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/** Ej: "Miércoles 20 de mayo". */
export function formatDayHeading(ymd: string): string {
  const date = parseYmd(ymd);
  return `${WEEKDAY_LABELS_LONG[date.getDay()]} ${date.getDate()} de ${MONTH_LABELS_LONG[date.getMonth()].toLowerCase()}`;
}

/** Ej: "20 mayo 2026". */
export function formatDateShort(ymd: string): string {
  const date = parseYmd(ymd);
  return `${date.getDate()} ${MONTH_LABELS_LONG[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
}

/** Suma días sin mutar el original. */
export function addDays(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

/** Convierte un "HH:mm" o "HH:mm:ss" a minutos desde medianoche. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Normaliza un time a "HH:mm" para comparaciones consistentes. */
export function normalizeTimeShort(time: string): string {
  const parts = time.split(":");
  const h = (parts[0] ?? "00").padStart(2, "0");
  const m = (parts[1] ?? "00").padStart(2, "0");
  return `${h}:${m}`;
}

/** Normaliza una fecha (acepta "YYYY-MM-DD" o ISO completo) a YYYY-MM-DD. */
export function normalizeDateShort(date: string): string {
  if (!date) return "";
  if (date.length === 10) return date;
  return date.split("T")[0] ?? date;
}
