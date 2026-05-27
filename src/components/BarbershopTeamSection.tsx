import type { Barber } from "@/data/demo-barbershops";

type BarbershopTeamSectionProps = {
  barbers: Barber[];
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function BarbershopTeamSection({ barbers }: BarbershopTeamSectionProps) {
  const activeBarbers = barbers.filter((barber) => barber.isActive);
  if (activeBarbers.length === 0) return null;

  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12">
        <header className="text-center sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Equipo
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Nuestros barberos
          </h2>
        </header>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeBarbers.map((barber) => {
            const displayName =
              barber.displayName?.trim() || barber.name.trim();
            return (
              <li
                key={barber.id}
                className="group flex items-center gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)]/40"
              >
                <div
                  aria-hidden="true"
                  className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] font-mono text-base font-black uppercase text-[color:var(--brand-gold)]"
                >
                  {getInitials(displayName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">
                    {displayName}
                  </p>
                  {barber.role ? (
                    <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      {barber.role}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
