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

/** Un tramo del día, en minutos desde las 00:00. */
export type Tramo = { inicio: number; fin: number };

/** "HH:MM" o "HH:MM:SS" → minutos desde las 00:00. */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

/**
 * Por qué un horario NO figura en la grilla.
 *
 * La grilla solo trae los horarios que se pueden ofrecer: los que pisan un
 * turno o un bloqueo directamente no aparecen. Entonces un horario que se
 * ocupó mientras el cliente llenaba el formulario desaparecía de la grilla y
 * caía en el mismo cartel que un horario que nunca existió: "no está en la
 * agenda de ese barbero". Era el error inverso al que este archivo vino a
 * arreglar — ahí se inventaba un choque, acá se escondía uno real.
 *
 * Devuelve `null` cuando no pisa nada: ahí sí es que para ese barbero ese
 * horario no existe (fuera de su día, o en su pausa).
 */
export function motivoFueraDeGrilla(params: {
  inicio: number;
  duracion: number;
  turnos: Tramo[];
  bloqueos: Tramo[];
}): Extract<Motivo, "occupied" | "blocked"> | null {
  const fin = params.inicio + params.duracion;
  const pisa = (t: Tramo) => t.inicio < fin && t.fin > params.inicio;
  if (params.turnos.some(pisa)) return "occupied";
  if (params.bloqueos.some(pisa)) return "blocked";
  return null;
}

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
