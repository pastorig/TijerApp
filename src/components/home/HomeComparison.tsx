import { Check, MessageCircle, Sparkles, Table, X } from "lucide-react";
import { Reveal } from "./ui/Reveal";

type Competitor = {
  icon: typeof MessageCircle;
  name: string;
  features: { label: string; available: "yes" | "no" | "limited" }[];
  bottom: string;
};

const COMPETITORS: Competitor[] = [
  {
    icon: MessageCircle,
    name: "WhatsApp",
    features: [
      { label: "Reservas online sin app", available: "no" },
      { label: "Multi-barbero", available: "no" },
      { label: "Recordatorios automáticos", available: "no" },
      { label: "Reportes y caja diaria", available: "no" },
      { label: "Bloqueo de doble-bookings", available: "no" },
      { label: "Lista de espera", available: "no" },
    ],
    bottom: "Gratis, pero te come 2h por día acomodando turnos.",
  },
  {
    icon: Table,
    name: "Excel / papel",
    features: [
      { label: "Reservas online sin app", available: "no" },
      { label: "Multi-barbero", available: "limited" },
      { label: "Recordatorios automáticos", available: "no" },
      { label: "Reportes y caja diaria", available: "limited" },
      { label: "Bloqueo de doble-bookings", available: "no" },
      { label: "Lista de espera", available: "no" },
    ],
    bottom: "Funciona si tenés 1 sillón. No escala.",
  },
];

const TIJERAPP_FEATURES = [
  { label: "Reservas online sin app", available: "yes" as const },
  { label: "Multi-barbero", available: "yes" as const },
  { label: "Recordatorios automáticos", available: "yes" as const },
  { label: "Reportes y caja diaria", available: "yes" as const },
  { label: "Bloqueo de doble-bookings", available: "yes" as const },
  { label: "Lista de espera", available: "yes" as const },
];

/** Punto de estado en la lista: ✓ dorado / ✕ rojo / ~ ámbar. */
function StatusDot({ status }: { status: "yes" | "no" | "limited" }) {
  if (status === "yes") {
    return (
      <span
        aria-label="Sí"
        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)]"
        style={{ boxShadow: "0 0 12px -5px rgba(201,162,62,0.8)" }}
      >
        <Check className="size-3 text-[color:var(--brand-gold)]" strokeWidth={3} />
      </span>
    );
  }
  if (status === "limited") {
    return (
      <span
        aria-label="Limitado"
        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-2)] text-[11px] font-black text-[color:var(--text-muted)]"
      >
        ~
      </span>
    );
  }
  return (
    <span
      aria-label="No"
      className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)]"
    >
      <X className="size-3 text-[color:var(--danger)]" strokeWidth={3} />
    </span>
  );
}

export function HomeComparison() {
  return (
    <section className="relative border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
      {/* Glow dorado centrado detrás de la card ganadora */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 45% at 50% 60%, rgba(201,162,62,0.08), transparent 70%)",
        }}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Comparativa
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            ¿Por qué no seguir con lo que ya{" "}
            <span className="text-gold-gradient">usás</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7">
            Mirá lado a lado qué hace TijerApp que tu setup actual no puede.
          </p>
        </header>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)] sm:hidden">
          ← Deslizá para comparar →
        </p>

        <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-5 sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:pt-0 lg:grid-cols-3">
          {/* TijerApp — card ganadora (orden distinto en mobile vs desktop) */}
          <Reveal
            as="div"
            delay={80}
            className="card-premium card-premium-glow order-first flex w-[85%] shrink-0 snap-center flex-col p-5 sm:w-auto sm:shrink sm:snap-align-none sm:p-6 lg:order-last"
          >
            <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gold-grad px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-black shadow-[0_6px_20px_-6px_rgba(201,162,62,0.7)]">
              La mejor opción
            </div>
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
                style={{ boxShadow: "0 0 24px -8px rgba(201,162,62,0.7)" }}
              >
                <Sparkles className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-gold-gradient sm:text-lg">
                  TijerApp
                </h3>
                <p className="text-xs text-[color:var(--brand-gold)]">
                  La opción completa
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-2.5 border-t border-[color:var(--brand-gold)]/15 pt-4">
              {TIJERAPP_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5">
                  <StatusDot status={f.available} />
                  <span className="text-[13px] font-medium text-white">
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            <div
              className="mt-5 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 p-3"
              style={{
                backgroundImage:
                  "radial-gradient(120% 120% at 0% 0%, rgba(201,162,62,0.16), transparent 60%)",
              }}
            >
              <p className="text-[11px] font-black uppercase tracking-wider text-gold-gradient">
                Desde $22.000/mes
              </p>
              <p className="mt-1 text-sm leading-5 text-[color:var(--text-secondary)]">
                Cobra en pesos. 14 días gratis. Cancelás cuando quieras.
              </p>
            </div>
          </Reveal>

          {/* Competidores */}
          {COMPETITORS.map((c, index) => {
            const Icon = c.icon;
            return (
              <Reveal
                as="div"
                key={c.name}
                delay={index * 90}
                className="card-premium card-premium-hover flex w-[85%] shrink-0 snap-center flex-col p-5 opacity-90 sm:w-auto sm:shrink sm:snap-align-none sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-[color:var(--text-secondary)] sm:text-lg">
                      {c.name}
                    </h3>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Lo que ya usás
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 border-t border-[color:var(--border-subtle)] pt-4">
                  {c.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-2.5">
                      <StatusDot status={f.available} />
                      <span className="text-[13px] text-[color:var(--text-secondary)]">
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-3">
                  <p className="text-sm leading-5 text-[color:var(--text-muted)]">
                    {c.bottom}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="mx-auto mt-8 max-w-3xl text-center sm:mt-10">
          <p className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[color:var(--text-muted)] sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot status="yes" />
              Incluido
            </span>
            <span className="text-[color:var(--text-subtle)]">·</span>
            <span className="inline-flex items-center gap-1.5">
              <StatusDot status="limited" />
              Limitado
            </span>
            <span className="text-[color:var(--text-subtle)]">·</span>
            <span className="inline-flex items-center gap-1.5">
              <StatusDot status="no" />
              No disponible
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
