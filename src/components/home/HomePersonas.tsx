import {
  ArrowUpRight,
  Briefcase,
  Scissors,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";

type Persona = {
  icon: typeof User;
  name: string;
  role: string;
  pain: string;
  solution: string;
  highlights: string[];
};

const PERSONAS: Persona[] = [
  {
    icon: Briefcase,
    name: "Pedro, 42",
    role: "Dueño de barbería con 3 sillones",
    pain: "Pierde turnos por WhatsApp desorganizado y doble-bookings.",
    solution:
      "Agenda visual multi-barbero, lista de espera y reportes para saber cuánto factura cada uno.",
    highlights: [
      "Multi-barbero ilimitado",
      "Reportes por barbero",
      "Cierre de caja diario",
    ],
  },
  {
    icon: TrendingUp,
    name: "Juan, 28",
    role: "Barbero ambicioso, quiere crecer",
    pain: "Quiere imagen profesional pero no puede pagar Booksy ni invertir en app nativa.",
    solution:
      "URL pública con su marca, reservas sin app y push notifications cuando le entran turnos.",
    highlights: [
      "Página pública con marca",
      "Push en tiempo real",
      "Programa Fundadores",
    ],
  },
  {
    icon: Scissors,
    name: "Camila, 31",
    role: "Barbera independiente, alquila sillón",
    pain: "Lleva la agenda en papel, olvida turnos, pierde clientes ghost.",
    solution:
      "Reservas online, recordatorios automáticos y detección de clientes que no vinieron.",
    highlights: [
      "Recordatorios automáticos",
      "Detección de ghost clients",
      "Solo USD 10/mes",
    ],
  },
];

export function HomePersonas() {
  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            ¿Para quién es TijerApp?
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Pensado para los{" "}
            <span className="text-[color:var(--brand-gold)]">
              3 perfiles
            </span>{" "}
            de la barbería moderna
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7">
            Ya seas dueño, ambicioso o independiente, hay un plan y un flujo
            que se adapta a cómo trabajás.
          </p>
        </header>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)] sm:hidden">
          ← Deslizá para ver los 3 perfiles →
        </p>

        <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {PERSONAS.map((persona) => {
            const Icon = persona.icon;
            return (
              <li
                key={persona.name}
                className="hover-glow flex w-[85%] shrink-0 snap-center flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-5 sm:w-auto sm:shrink sm:snap-align-none sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white sm:text-lg">
                      {persona.name}
                    </h3>
                    <p className="text-xs text-[color:var(--text-secondary)]">
                      {persona.role}
                    </p>
                  </div>
                </div>

                <div className="rounded-[var(--radius-sm)] border-l-2 border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)]/30 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--danger)]">
                    El problema
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[color:var(--text-secondary)]">
                    {persona.pain}
                  </p>
                </div>

                <div className="rounded-[var(--radius-sm)] border-l-2 border-[color:var(--brand-gold)]/60 bg-[color:var(--brand-gold-soft)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--brand-gold)]">
                    Cómo lo resolvemos
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[color:var(--text-secondary)]">
                    {persona.solution}
                  </p>
                </div>

                <ul className="mt-auto space-y-1.5 border-t border-[color:var(--border-subtle)] pt-4">
                  {persona.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-center gap-2 text-[13px] text-[color:var(--text-secondary)]"
                    >
                      <span
                        aria-hidden="true"
                        className="text-[color:var(--brand-gold)]"
                      >
                        ✓
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex justify-center sm:mt-12">
          <Link
            href="/precios"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-7 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            ¿Cuál sos vos? Mirá los planes
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
