/**
 * Cuándo corresponde avisarle al cliente que le cancelaron el turno.
 *
 * ── Por qué no se avisa siempre ─────────────────────────────────────────────
 * Un mail que dice "cancelamos tu turno" mandado en el momento equivocado es
 * peor que no mandar nada: al que no vino le llega un reproche automático, y al
 * que llamó para cancelar le llega la noticia de algo que pidió él. Las dos
 * cosas hacen que el próximo mail de la barbería se lea con menos ganas.
 *
 * Los tres casos en los que se calla, y por qué:
 *
 *   1. **El turno ya pasó.** Avisar de un turno de ayer no sirve para nada.
 *   2. **No vino.** Además de ser pasado, es la peor situación para mandar un
 *      mail automático: el cliente ya quedó mal y esto se lee como el remate.
 *   3. **Avisó el cliente.** Lo pidió él. Contárselo es ruido.
 *
 * Fuera de esos tres, el cliente **tiene que enterarse**: el turno lo canceló
 * la barbería y si nadie le dice, se presenta.
 *
 * Todo puro: se testea sin base y sin reloj.
 */

import { NO_SHOW_PRESET_LABEL } from "@/lib/client-segments";

/** El preset que usa el diálogo cuando fue el cliente el que pidió cancelar. */
export const CLIENTE_AVISO_PRESET_LABEL = "Cliente avisó";

export type DecisionDeAviso =
  | { avisar: true }
  | { avisar: false; porque: string };

export function debeAvisarCancelacion({
  motivo,
  fecha,
  hora,
  ahora,
}: {
  /** El `cancellation_reason` que se guardó. Puede no haber ninguno. */
  motivo: string | null | undefined;
  /** Del turno, "YYYY-MM-DD" y "HH:MM" (o "HH:MM:SS"). */
  fecha: string;
  hora: string;
  /** Hoy y ahora, en hora argentina. Lo inyecta quien llama. */
  ahora: { fecha: string; hora: string };
}): DecisionDeAviso {
  const cuando = `${fecha} ${hora.slice(0, 5)}`;
  const ahoraStr = `${ahora.fecha} ${ahora.hora.slice(0, 5)}`;

  // Las dos cadenas tienen el mismo formato de ancho fijo, así que comparar
  // como texto ordena igual que comparar como fechas — y sin construir un Date,
  // que es donde aparecen los líos de zona horaria.
  if (cuando <= ahoraStr) {
    return { avisar: false, porque: "el turno ya pasó" };
  }

  const limpio = (motivo ?? "").trim().toLowerCase();
  if (limpio.startsWith(NO_SHOW_PRESET_LABEL.toLowerCase())) {
    return { avisar: false, porque: "el cliente no vino" };
  }
  if (limpio.startsWith(CLIENTE_AVISO_PRESET_LABEL.toLowerCase())) {
    return { avisar: false, porque: "lo pidió el cliente" };
  }

  return { avisar: true };
}
