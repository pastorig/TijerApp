import type { InitialServiceInput } from "@/lib/provision-barbershop";

/**
 * Valores con los que el registro self-serve provisiona una barbería nueva.
 *
 * Viven acá y no dentro del route handler del registro porque los necesitan
 * **dos** lados: el registro (para crear la barbería) y la guía de primeros
 * pasos (para saber si el barbero todavía no los revisó). Si estuvieran
 * duplicados, el día que se cambie el servicio inicial la guía empezaría a
 * mentir en silencio.
 *
 * Módulo plano a propósito: sin `"use client"`, así lo pueden importar tanto el
 * route handler (servidor) como el componente de la guía (cliente).
 */

/** Horario base con el que arranca la barbería; se edita luego en Config. */
export const DEFAULT_WORKING_HOURS = {
  start: "09:00",
  end: "20:00",
  intervalMinutes: 30,
} as const;

/**
 * Servicio inicial para que la barbería sea usable desde el minuto cero (sin
 * al menos un servicio no se puede reservar). El barbero ajusta precio y
 * duración en su panel — la guía de primeros pasos se lo pide.
 */
export const DEFAULT_SERVICES: InitialServiceInput[] = [
  { name: "Corte", price: 10000, durationMinutes: 30 },
];

/** Días de trial. El sitio público promete 14 en todas sus páginas. */
export const TRIAL_DAYS = 14;

/**
 * Días que el registro deja CERRADOS (0 = domingo).
 *
 * Existe como constante y no como un `!== 0` suelto porque tres lugares
 * necesitan estar de acuerdo: el provisioning, la detección de "ya configuró sus
 * horarios" y el texto que se le muestra al barbero. Cuando el texto repetía el
 * dato a mano, decía "abierto todos los días, domingo incluido" — lo contrario
 * de lo que hacía el registro.
 */
export const DEFAULT_CLOSED_DAYS: readonly number[] = [0];

/** True si el registro deja ese día de la semana trabajando. */
export function isDefaultWorkingDay(dayOfWeek: number): boolean {
  return !DEFAULT_CLOSED_DAYS.includes(dayOfWeek);
}

const DAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** "de lunes a sábado" — derivado de `DEFAULT_CLOSED_DAYS`, no escrito a mano. */
export function describeDefaultOpenDays(): string {
  const open = [0, 1, 2, 3, 4, 5, 6].filter(isDefaultWorkingDay);
  if (open.length === 7) return "todos los días";
  if (open.length === 0) return "ningún día";
  const contiguous = open.every((day, i) => i === 0 || day === open[i - 1] + 1);
  if (contiguous && open.length > 2) {
    return `de ${DAY_NAMES[open[0]]} a ${DAY_NAMES[open[open.length - 1]]}`;
  }
  return open.map((day) => DAY_NAMES[day]).join(", ");
}

/** "09:00 a 20:00, de lunes a sábado" — todo derivado de las constantes. */
export function describeDefaultSchedule(): string {
  return `${DEFAULT_WORKING_HOURS.start} a ${DEFAULT_WORKING_HOURS.end}, ${describeDefaultOpenDays()}`;
}

/** "un corte de ejemplo a $10.000" — el precio sale de `DEFAULT_SERVICES`. */
export function describeDefaultService(): string {
  const service = DEFAULT_SERVICES[0];
  if (!service) return "un servicio de ejemplo";
  const price = `$${service.price.toLocaleString("es-AR")}`;
  return `un ${service.name.toLowerCase()} de ejemplo a ${price}`;
}

type ServiceLike = {
  name: string;
  price: number;
  durationMinutes: number;
};

type WorkingHoursLike = {
  start: string;
  end: string;
  intervalMinutes: number;
};

/**
 * True si el servicio sigue siendo, tal cual, el que dejó el registro.
 *
 * Se usa para lo contrario de lo que parece: un servicio que coincide con el
 * default significa que el barbero **todavía no lo revisó** (su corte no vale
 * exactamente $10.000 por casualidad). El nombre se compara sin distinguir
 * mayúsculas ni espacios de más.
 */
export function isDefaultService(service: ServiceLike): boolean {
  return DEFAULT_SERVICES.some(
    (fallback) =>
      service.name.trim().toLowerCase() === fallback.name.toLowerCase() &&
      service.price === fallback.price &&
      service.durationMinutes === fallback.durationMinutes,
  );
}

/** True si el horario base sigue siendo, tal cual, el que dejó el registro. */
export function isDefaultWorkingHours(hours: WorkingHoursLike): boolean {
  return (
    hours.start === DEFAULT_WORKING_HOURS.start &&
    hours.end === DEFAULT_WORKING_HOURS.end &&
    hours.intervalMinutes === DEFAULT_WORKING_HOURS.intervalMinutes
  );
}

type WeeklyScheduleLike = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
  break_start?: string | null;
  break_end?: string | null;
};

/** La base devuelve "09:00:00"; el horario por defecto está en "09:00". */
function toHhMm(time: string): string {
  return time.slice(0, 5);
}

/**
 * True si el horario semanal de los barberos sigue siendo el que armó el
 * registro: **lunes a sábado con el horario base y el domingo cerrado**, sin
 * pausas.
 *
 * Esto existe porque los días y horarios de verdad viven en
 * `barber_weekly_schedules`, no en el horario base de la barbería: un barbero
 * puede cerrar el miércoles o abrir distinto los sábados sin tocar nunca el
 * horario base. Mirando solo la barbería, la guía le pedía revisar horarios a
 * alguien que ya los había configurado.
 *
 * Sin filas se considera "sin configurar" (el paso queda pendiente).
 */
export function isDefaultWeeklySchedule(rows: WeeklyScheduleLike[]): boolean {
  if (rows.length === 0) return true;
  return rows.every(
    (row) =>
      toHhMm(row.start_time) === DEFAULT_WORKING_HOURS.start &&
      toHhMm(row.end_time) === DEFAULT_WORKING_HOURS.end &&
      row.is_working === isDefaultWorkingDay(row.day_of_week) &&
      !row.break_start &&
      !row.break_end,
  );
}
