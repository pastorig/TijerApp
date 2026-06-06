import { Clock, MapPin, Smartphone, Zap } from "lucide-react";

type Stat = {
  icon: typeof Clock;
  number: string;
  label: string;
  caption: string;
};

const STATS: Stat[] = [
  {
    icon: Zap,
    number: "<3min",
    label: "Setup",
    caption: "Listo desde el panel admin sin asistencia técnica.",
  },
  {
    icon: Smartphone,
    number: "0",
    label: "Apps que descargar",
    caption: "Tus clientes reservan desde el navegador. Cero fricción.",
  },
  {
    icon: Clock,
    number: "24/7",
    label: "Disponibilidad",
    caption: "Recibís reservas mientras dormís. Hosting en Vercel + Supabase.",
  },
  {
    icon: MapPin,
    number: "100%",
    label: "Argentino",
    caption: "Soporte en español, pricing en pesos, hecho en Córdoba.",
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
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <li
                key={stat.label}
                className="flex flex-col items-start gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-4 sm:p-5"
              >
                <div
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)] sm:size-9"
                >
                  <Icon className="size-4" />
                </div>
                <div className="stat-number text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {stat.number}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)] sm:text-xs">
                  {stat.label}
                </div>
                <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)] sm:text-sm">
                  {stat.caption}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
