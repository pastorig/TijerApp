import { CalendarCheck, Settings2, Smartphone } from "lucide-react";
import { Reveal } from "./ui/Reveal";
import { StepsProgressLine } from "./ui/StepsProgressLine";

/** Punto del trazado en el que se enciende cada paso (ver `.step-icon`). */
const STEP_THRESHOLDS = [0.15, 0.5, 0.85];

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

        <StepsProgressLine className="relative mt-10 grid gap-6 sm:grid-cols-3 sm:gap-4 lg:gap-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal
                as="li"
                key={step.number}
                delay={index * 90}
                className="card-premium card-premium-hover group relative p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-3xl font-black tabular-nums leading-none text-gold-gradient">
                    {step.number}
                  </span>
                  <span
                    aria-hidden="true"
                    className="step-icon z-10 flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
                    style={
                      {
                        "--step-threshold": STEP_THRESHOLDS[index],
                        boxShadow: "0 0 22px -8px rgba(201,162,62,0.6)",
                      } as React.CSSProperties
                    }
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
              </Reveal>
            );
          })}
        </StepsProgressLine>
      </div>
    </section>
  );
}
