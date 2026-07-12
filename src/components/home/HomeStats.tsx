import { BellRing, CalendarCheck, Clock, Smartphone } from "lucide-react";

/**
 * Tira de beneficios de la home (debajo del hero). Reemplazó a las 4 métricas
 * sueltas (<3min / 0 apps / 24-7 / 100%) por 4 beneficios concretos escritos
 * en palabras de todos los días — venden mejor que un número sin contexto.
 */
type Benefit = {
  icon: typeof Clock;
  title: string;
  caption: string;
};

const BENEFITS: Benefit[] = [
  {
    icon: Smartphone,
    title: "Reservas sin apps",
    caption: "Tus clientes sacan turno desde el celular, sin descargar nada.",
  },
  {
    icon: CalendarCheck,
    title: "Sin turnos pisados",
    caption: "La app no deja dos clientes a la misma hora ni turnos olvidados.",
  },
  {
    icon: BellRing,
    title: "Menos clientes que faltan",
    caption: "Recordatorio automático y te marca quién no vino.",
  },
  {
    icon: Clock,
    title: "Abierto las 24 horas",
    caption: "Recibís reservas hasta mientras dormís, sin atender el teléfono.",
  },
];

export function HomeStats() {
  return (
    <section className="relative isolate overflow-hidden border-t border-[color:var(--border-subtle)] bg-black">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 50%, color-mix(in oklab, var(--brand-gold) 6%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
        <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <li
                key={benefit.title}
                className="flex flex-col items-start gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-4 sm:p-5"
              >
                <div
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)] sm:size-10"
                >
                  <Icon className="size-4 sm:size-5" />
                </div>
                <h3 className="mt-1 text-base font-black tracking-tight text-white sm:text-lg">
                  {benefit.title}
                </h3>
                <p className="text-xs leading-5 text-[color:var(--text-secondary)] sm:text-sm">
                  {benefit.caption}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
