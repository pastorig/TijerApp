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

/** True si el horario sigue siendo, tal cual, el que dejó el registro. */
export function isDefaultWorkingHours(hours: WorkingHoursLike): boolean {
  return (
    hours.start === DEFAULT_WORKING_HOURS.start &&
    hours.end === DEFAULT_WORKING_HOURS.end &&
    hours.intervalMinutes === DEFAULT_WORKING_HOURS.intervalMinutes
  );
}
