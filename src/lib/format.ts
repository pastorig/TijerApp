export function formatPrice(price: number) {
  return `$${price.toLocaleString("es-AR")}`;
}

export function formatDateForDisplay(date: string) {
  const [year, month, day] = normalizeDateValue(date).split("-");

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

const WEEKDAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

/**
 * Formatea una fecha YYYY-MM-DD a "jueves 18/06" (día de semana + dd/mm).
 * Usado en el resumen del turno, confirmación, /r/[token] y WhatsApp.
 * Construye la Date con componentes locales para evitar el corrimiento de
 * timezone que tendría `new Date("2026-06-18")` (parsea UTC).
 */
export function formatDateWithWeekday(date: string) {
  const [year, month, day] = normalizeDateValue(date).split("-").map(Number);

  if (!year || !month || !day) {
    return date;
  }

  const d = new Date(year, month - 1, day);
  const weekday = WEEKDAY_NAMES[d.getDay()];
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");

  return `${weekday} ${dd}/${mm}`;
}

/**
 * Devuelve solo el nombre del día de la semana de una fecha YYYY-MM-DD,
 * ej "jueves". Para mostrar como hint al lado del selector de fecha nativo
 * (que ya muestra dd/mm/yyyy y no se puede reformatear).
 */
export function getWeekdayName(date: string): string {
  const [year, month, day] = normalizeDateValue(date).split("-").map(Number);
  if (!year || !month || !day) return "";
  return WEEKDAY_NAMES[new Date(year, month - 1, day).getDay()];
}

export function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function normalizeDateValue(date: string) {
  return date.slice(0, 10);
}

export function normalizeTimeValue(time: string) {
  const [hours = "00", minutes = "00"] = time.split(":");

  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

export function timeValueToMinutes(time: string) {
  const [hours, minutes] = normalizeTimeValue(time).split(":").map(Number);

  return hours * 60 + minutes;
}
