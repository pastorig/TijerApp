import { CalendarCheck, Settings2, Smartphone } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Settings2,
    title: "Configurás tu barbería",
    body: "Cargás tus barberos, sus servicios y sus horarios. En 10 minutos estás listo para recibir reservas.",
  },
  {
    number: "02",
    icon: Smartphone,
    title: "Tus clientes reservan",
    body: "Compartís el link de tu barbería. Eligen barbero, servicio y horario libre. Sin crear cuenta.",
  },
  {
    number: "03",
    icon: CalendarCheck,
    title: "Vos confirmás y gestionás",
    body: "Desde el panel admin ves todos los turnos del día, confirmás con un toque y mandás WhatsApp si querés.",
  },
];

export function HomeHowItWorks() {
  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Cómo funciona
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Tres pasos y tu barbería online
          </h2>
        </header>

        <ol className="relative mt-10 grid gap-6 sm:grid-cols-3 sm:gap-4 lg:gap-6">
          {/* Línea de flujo que conecta los 3 pasos en desktop. Va detrás de
              las cards (fondo sólido), así que solo asoma en los gaps entre
              pasos, a la altura de los íconos → efecto de pasos encadenados. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-[3.5rem] hidden h-px sm:block"
            style={{
              background:
                "linear-gradient(to right, transparent, var(--brand-gold-ring) 15%, var(--brand-gold-ring) 85%, transparent)",
            }}
          />
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.number}
                className="relative rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-2xl font-black tabular-nums leading-none text-[color:var(--brand-gold)]">
                    {step.number}
                  </span>
                  <span
                    aria-hidden="true"
                    className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
                  >
                    <Icon className="size-5" />
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold uppercase tracking-tight text-white sm:text-xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
