import { Check } from "lucide-react";
import { Reveal } from "./ui/Reveal";

const BENEFITS = [
  {
    title: "Sin instalación",
    body: "Tus clientes reservan desde el navegador, sin descargas ni cuentas. Vos administrás todo desde el mismo lugar.",
  },
  {
    title: "Pensado para barberías",
    body: "Multi-barbero nativo, servicios con duración y precio, horarios por día de la semana. Nada genérico.",
  },
  {
    title: "Operativo, no decorativo",
    body: "Pensado para usarlo mientras cortás. Confirmás, cancelás y mandás WhatsApp en uno o dos toques.",
  },
  {
    title: "Reportes que se entienden",
    body: "Vas a saber cuánto facturás, qué barbero rinde más y en qué horarios. Sin dashboards inútiles.",
  },
];

export function HomeWhatIsIt() {
  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-16">
          <header>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
              Qué es TijerApp
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
              Una plataforma de turnos hecha para{" "}
              <span className="text-gold-gradient">barberías argentinas</span>
            </h2>
            <p className="mt-5 text-base leading-7 text-[color:var(--text-secondary)] sm:text-lg sm:leading-8">
              Centralizamos reservas, barberos, servicios y agenda en un solo
              lugar. Cada barbería con su espacio público y su panel admin.
              Vos te ocupás de cortar, TijerApp se ocupa del resto.
            </p>
          </header>

          <ul className="grid gap-3 sm:grid-cols-2">
            {BENEFITS.map((benefit, index) => (
              <Reveal
                as="li"
                key={benefit.title}
                delay={(index % 2) * 80}
                className="card-premium card-premium-hover group flex gap-3 p-5"
              >
                <div
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)] transition-transform duration-[var(--duration-fast)] group-hover:scale-105"
                  style={{ boxShadow: "0 0 18px -8px rgba(201,162,62,0.6)" }}
                >
                  <Check className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">
                    {benefit.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                    {benefit.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
