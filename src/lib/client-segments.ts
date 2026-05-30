/**
 * Segmentación derivada de clientes basada en visitas y recencia.
 * Se calcula on-the-fly desde appointments — no se persiste en DB.
 *
 * Umbrales pensados para barberías típicas (frecuencia ~ cada 2-4 semanas).
 */

export type ClientSegment =
  | "nuevo"
  | "activo"
  | "recurrente"
  | "vip"
  | "por-reactivar"
  | "inactivo"
  | "ghost"
  | "sin-visitas";

export type ClientSegmentMeta = {
  segment: ClientSegment;
  label: string;
  shortLabel: string;
  tone: "gold" | "green" | "blue" | "amber" | "red" | "purple" | "neutral";
  description: string;
};

export const SEGMENT_META: Record<ClientSegment, ClientSegmentMeta> = {
  vip: {
    segment: "vip",
    label: "VIP",
    shortLabel: "VIP",
    tone: "gold",
    description: "10+ visitas activas. Tu cliente más fiel.",
  },
  recurrente: {
    segment: "recurrente",
    label: "Recurrente",
    shortLabel: "Recurrente",
    tone: "green",
    description: "3+ visitas activas en los últimos meses.",
  },
  activo: {
    segment: "activo",
    label: "Activo",
    shortLabel: "Activo",
    tone: "blue",
    description: "2 visitas recientes, va camino a recurrente.",
  },
  nuevo: {
    segment: "nuevo",
    label: "Nuevo",
    shortLabel: "Nuevo",
    tone: "neutral",
    description: "Primera visita reciente.",
  },
  "por-reactivar": {
    segment: "por-reactivar",
    label: "Por reactivar",
    shortLabel: "Reactivar",
    tone: "amber",
    description: "Pasaron 30-60 días desde la última visita.",
  },
  inactivo: {
    segment: "inactivo",
    label: "Inactivo",
    shortLabel: "Inactivo",
    tone: "red",
    description: "Más de 60 días sin venir.",
  },
  ghost: {
    segment: "ghost",
    label: "Ghost",
    shortLabel: "Ghost",
    tone: "purple",
    description: "2+ no-shows registrados. Considerá pedir seña o aviso previo.",
  },
  "sin-visitas": {
    segment: "sin-visitas",
    label: "Sin visitas",
    shortLabel: "Sin visitas",
    tone: "neutral",
    description: "Todavía no completó ningún turno.",
  },
};

export const REACTIVATION_THRESHOLD_DAYS = 30;
export const INACTIVE_THRESHOLD_DAYS = 60;
export const RECURRENT_MIN_VISITS = 3;
export const VIP_MIN_VISITS = 10;
/** Mínimo de no-shows registrados para considerar a un cliente ghost. */
export const GHOST_MIN_NO_SHOWS = 2;

/**
 * Detecta si una `cancellation_reason` corresponde a un no-show registrado
 * desde el CancelAppointmentDialog. Se asume que el preset "Cliente no vino"
 * fue elegido (con o sin nota adicional) — el motivo guardado comienza con
 * ese label exacto.
 */
export function isNoShowReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return reason.toLowerCase().startsWith("cliente no vino");
}

/**
 * Calcula el segmento de un cliente a partir de:
 * - visits: cantidad de visitas activas (no canceladas, no eliminadas).
 * - daysSinceLastVisit: días desde la última visita, o null si nunca vino.
 * - noShowCount: cantidad de turnos cancelados marcados como "Cliente no
 *   vino". Default 0 (backwards compat con callers que no lo pasen).
 *
 * Prioridad: sin-visitas → inactivo (info más vieja primero) → ghost
 * (alta señal accionable) → por-reactivar → visit-based.
 */
export function computeSegment({
  visits,
  daysSinceLastVisit,
  noShowCount = 0,
}: {
  visits: number;
  daysSinceLastVisit: number | null;
  noShowCount?: number;
}): ClientSegment {
  // Sin actividad alguna — ni visitas ni no-shows.
  if (visits === 0 && noShowCount === 0) return "sin-visitas";

  // Inactivo gana primero porque ya no es accionable como ghost — pasó
  // tanto tiempo que cualquier patrón histórico es menos relevante.
  if (
    daysSinceLastVisit !== null &&
    daysSinceLastVisit > INACTIVE_THRESHOLD_DAYS
  ) {
    return "inactivo";
  }

  // Ghost: cliente con visitas (o sin) pero con patrón claro de no-shows.
  // Alta prioridad sobre segmentos basados en cantidad de visitas porque
  // habilita una acción concreta (pedir seña, aviso previo).
  if (noShowCount >= GHOST_MIN_NO_SHOWS) return "ghost";

  // Sin visitas pero con un solo no-show registrado: igual mostrarlo como
  // "sin-visitas" (todavía no hay patrón).
  if (visits === 0) return "sin-visitas";
  if (daysSinceLastVisit === null) return "sin-visitas";

  if (daysSinceLastVisit > REACTIVATION_THRESHOLD_DAYS) return "por-reactivar";

  if (visits >= VIP_MIN_VISITS) return "vip";
  if (visits >= RECURRENT_MIN_VISITS) return "recurrente";
  if (visits === 1) return "nuevo";
  return "activo";
}

export function segmentTagClasses(tone: ClientSegmentMeta["tone"]): string {
  switch (tone) {
    case "gold":
      return "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]";
    case "green":
      return "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]";
    case "blue":
      return "border-sky-400/40 bg-sky-400/10 text-sky-300";
    case "amber":
      return "border-amber-400/40 bg-amber-400/10 text-amber-300";
    case "red":
      return "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]";
    case "purple":
      return "border-purple-400/40 bg-purple-400/10 text-purple-300";
    case "neutral":
    default:
      return "border-[color:var(--border-default)] bg-[color:var(--surface-0)] text-[color:var(--text-muted)]";
  }
}

export function daysBetween(
  fromIsoDate: string,
  toIsoDate: string,
): number {
  // ISO dates yyyy-mm-dd. Comparación naive a nivel día.
  const from = new Date(fromIsoDate + "T00:00:00");
  const to = new Date(toIsoDate + "T00:00:00");
  const diffMs = to.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
