import { Check, MessageCircle, Sparkles, Table, X } from "lucide-react";

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

function StatusIcon({ status }: { status: "yes" | "no" | "limited" }) {
  if (status === "yes") {
    return (
      <Check
        aria-label="Sí"
        className="size-4 text-[color:var(--brand-gold)]"
      />
    );
  }
  if (status === "limited") {
    return (
      <span
        aria-label="Limitado"
        className="text-[10px] font-bold text-[color:var(--text-muted)]"
      >
        ~
      </span>
    );
  }
  return (
    <X
      aria-label="No"
      className="size-4 text-[color:var(--text-subtle)]"
    />
  );
}

export function HomeComparison() {
  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Comparativa
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            ¿Por qué no seguir con lo que ya{" "}
            <span className="text-[color:var(--brand-gold)]">usás</span>?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7">
            Mirá lado a lado qué hace TijerApp que tu setup actual no puede.
          </p>
        </header>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)] sm:hidden">
          ← Deslizá para comparar →
        </p>

        <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {/* TijerApp card — destacada (orden distinto en mobile vs desktop) */}
          <div className="glow-gold-soft order-first flex w-[85%] shrink-0 snap-center flex-col rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--surface-1)] p-5 ring-1 ring-[color:var(--brand-gold)]/30 sm:w-auto sm:shrink sm:snap-align-none sm:p-6 lg:order-last">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
              >
                <Sparkles className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-white sm:text-lg">
                  TijerApp
                </h3>
                <p className="text-xs text-[color:var(--brand-gold)]">
                  La opción completa
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-2.5 border-t border-[color:var(--border-subtle)] pt-4">
              {TIJERAPP_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-gold-soft)]">
                    <StatusIcon status={f.available} />
                  </span>
                  <span className="text-[13px] text-white">{f.label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--brand-gold)]">
                Desde USD 20/mes
              </p>
              <p className="mt-1 text-sm leading-5 text-[color:var(--text-secondary)]">
                Cobra en pesos. 7 días gratis. Cancelás cuando quieras.
              </p>
            </div>
          </div>

          {/* Competitor cards */}
          {COMPETITORS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.name}
                className="hover-glow flex w-[85%] shrink-0 snap-center flex-col rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-5 opacity-90 sm:w-auto sm:shrink sm:snap-align-none sm:p-6"
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
                    <li
                      key={f.label}
                      className="flex items-center gap-2.5 opacity-80"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-2)]">
                        <StatusIcon status={f.available} />
                      </span>
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
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-8 max-w-3xl text-center sm:mt-10">
          <p className="text-xs text-[color:var(--text-muted)] sm:text-sm">
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5 text-[color:var(--brand-gold)]" />
              Incluido
            </span>{" "}
            <span className="mx-2 text-[color:var(--text-subtle)]">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-[10px] font-bold text-[color:var(--text-muted)]">
                ~
              </span>
              Limitado
            </span>{" "}
            <span className="mx-2 text-[color:var(--text-subtle)]">·</span>
            <span className="inline-flex items-center gap-1">
              <X className="size-3.5 text-[color:var(--text-subtle)]" />
              No disponible
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
