import { ArrowUpRight, CalendarX, MessageSquare, UserX } from "lucide-react";
import Link from "next/link";

/**
 * Sección "¿es para vos?" de la home. Antes eran 3 "perfiles" con personajes
 * (Pedro/Juan/Camila) y jerga (ghost clients, push, Programa Fundadores) que
 * costaba entender. Ahora son 3 problemas cotidianos de cualquier barbería,
 * con su solución en palabras simples. Da igual el tamaño del local.
 */
type Item = {
  icon: typeof MessageSquare;
  problem: string;
  solution: string;
};

const ITEMS: Item[] = [
  {
    icon: MessageSquare,
    problem: "Se te llena el WhatsApp de turnos",
    solution:
      "Tus clientes reservan solos, online. Vos ves toda la agenda en una sola pantalla.",
  },
  {
    icon: CalendarX,
    problem: "Se te pisan o te olvidás turnos",
    solution:
      "La app no deja dos clientes a la misma hora y te avisa de cada reserva nueva.",
  },
  {
    icon: UserX,
    problem: "Reservan y después no vienen",
    solution:
      "Manda un recordatorio automático y te marca quién faltó, para no perder el lugar.",
  },
];

export function HomePersonas() {
  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Para tu barbería
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Da igual si tenés{" "}
            <span className="text-[color:var(--brand-gold)]">1 sillón o 5</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7">
            Si te pasa alguna de estas, TijerApp te lo resuelve.
          </p>
        </header>

        <ul className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.problem}
                className="hover-glow flex w-[85%] shrink-0 snap-center flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-5 sm:w-auto sm:shrink sm:snap-align-none sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)]/40 text-[color:var(--danger)]"
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-base font-bold leading-snug text-white sm:text-lg">
                    {item.problem}
                  </h3>
                </div>

                <div className="mt-auto rounded-[var(--radius-sm)] border-l-2 border-[color:var(--brand-gold)]/60 bg-[color:var(--brand-gold-soft)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--brand-gold)]">
                    Con TijerApp
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[color:var(--text-secondary)]">
                    {item.solution}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex justify-center sm:mt-12">
          <Link
            href="/precios"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-7 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            Ver planes y precios
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
