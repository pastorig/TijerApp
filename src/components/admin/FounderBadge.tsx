import { Crown } from "lucide-react";
import { isFounder } from "@/data/founders";

/**
 * Badge "Fundador" del panel admin — perk del Programa Fundadores.
 *
 * Se muestra en la barra superior, así el barbero lo ve en toda la app y no
 * solo en una pantalla. Si la barbería no es fundadora no renderiza nada.
 *
 * En mobile queda solo la corona (el texto ocuparía el ancho que necesita el
 * nombre de la sección); desde sm se ve "Fundador" completo.
 */
export function FounderBadge({ barbershopSlug }: { barbershopSlug: string }) {
  if (!isFounder(barbershopSlug)) return null;

  return (
    <span
      title="Sos parte de los primeros 10 — Programa Fundadores"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold-grad px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-black sm:px-2.5"
    >
      <Crown aria-hidden="true" className="size-3" />
      <span className="hidden sm:inline">Fundador</span>
      <span className="sr-only sm:hidden">Fundador</span>
    </span>
  );
}
