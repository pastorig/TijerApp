import type { AvailabilitySlot } from "@/lib/availability";

/**
 * Por qué no se puede reservar un horario, dicho en criollo.
 *
 * ── De dónde sale ───────────────────────────────────────────────────────────
 * Todos los motivos volvían del servidor como "Ese horario no está disponible",
 * y el navegador encima los reescribía TODOS como "acaba de ocuparse". Una
 * barbería reportó que un barbero le bloqueaba la agenda a otro: en realidad el
 * horario caía fuera del día de ese barbero —los dos arrancan a horas distintas
 * y sus grillas no coinciden— pero el cartel decía que alguien se lo había
 * ganado de mano, y salieron a buscar un choque que no existía.
 *
 * Está separado del módulo `server-only` a propósito: así se puede testear sin
 * levantar Next.
 */
type Motivo = AvailabilitySlot["reason"];

const TEXTOS: Record<Exclude<Motivo, "available">, string> = {
  occupied: "Ese horario acaba de ocuparse. Elegí otro.",
  blocked: "Ese horario está bloqueado. Elegí otro.",
  past: "Ese horario ya pasó. Elegí otro.",
  "outside-hours": "Ese barbero no atiende a esa hora. Elegí otro horario.",
  "too-soon": "Falta muy poco para ese turno. Elegí uno más adelante.",
};

/**
 * `null` cuando el horario ni figura en la grilla de ese barbero: no es que
 * esté tomado, es que para él ese horario no existe.
 */
export function motivoDeHorario(motivo: Motivo | null | undefined): string {
  if (!motivo || motivo === "available") {
    return "Ese horario no está en la agenda de ese barbero. Elegí otro.";
  }
  return TEXTOS[motivo];
}
