import Link from "next/link";
import { ArrowUpRight, Check, Crown } from "lucide-react";
import { cn } from "@/lib/cn";

type TeaserPlan = {
  name: string;
  tagline: string;
  monthlyArs: number;
  highlight: boolean;
  features: string[];
};

const TEASER_PLANS: TeaserPlan[] = [
  {
    name: "Solo",
    tagline: "Barbero independiente",
    monthlyArs: 22000,
    highlight: false,
    features: [
      "1 barbero",
      "Reservas ilimitadas",
      "Recordatorios automáticos",
    ],
  },
  {
    name: "Esencial",
    tagline: "Barbería con 2 sillones",
    monthlyArs: 41000,
    highlight: true,
    features: [
      "Hasta 2 barberos",
      "Cobro de seña + cupones",
      "Reportes por barbero + PDF",
    ],
  },
  {
    name: "Pro",
    tagline: "Para crecer en serio",
    monthlyArs: 61000,
    highlight: false,
    features: [
      "Barberos ilimitados",
      "Fidelización + equipo (5 admins)",
      "Soporte WhatsApp <24h",
    ],
  },
];

export function PricingTeaser() {
  return (
    <section
      id="planes"
      className="relative isolate overflow-hidden border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 0%, color-mix(in oklab, var(--brand-gold) 8%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Planes
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Precios para la{" "}
            <span className="text-[color:var(--brand-gold)]">
              realidad argentina
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7">
            Cobramos en pesos al TC MEP del mes. 14 días gratis sin tarjeta.
            Cancelás cuando quieras.
          </p>
        </header>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)] sm:hidden">
          ← Deslizá para comparar →
        </p>

        <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0">
          {TEASER_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "hover-glow relative flex w-[80%] shrink-0 snap-center flex-col rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] p-5 sm:w-auto sm:shrink sm:snap-align-none sm:p-6",
                plan.highlight
                  ? "glow-gold-soft border-[color:var(--brand-gold)]/40 ring-1 ring-[color:var(--brand-gold)]/30"
                  : "border-[color:var(--border-default)]",
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--brand-gold)] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-black">
                  Más elegido
                </div>
              )}

              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  {plan.name}
                </h3>
                {plan.name === "Pro" && (
                  <Crown
                    aria-hidden="true"
                    className="size-4 text-[color:var(--brand-gold)]"
                  />
                )}
              </div>
              <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                {plan.tagline}
              </p>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  ${plan.monthlyArs.toLocaleString("es-AR")}
                </span>
                <span className="text-xs text-[color:var(--text-secondary)]">
                  / mes
                </span>
              </div>

              <ul className="mt-4 space-y-2 border-t border-[color:var(--border-subtle)] pt-4">
                {plan.features.map((feature) => (
                  <li
                    key={`${plan.name}-${feature}`}
                    className="flex items-start gap-2"
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0 text-[color:var(--brand-gold)]"
                    />
                    <span className="text-[13px] leading-5 text-[color:var(--text-secondary)]">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:mt-12 sm:flex-row sm:justify-center">
          <Link
            href="/precios"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-7 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110 sm:w-auto"
          >
            Ver todos los planes
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
          <Link
            href="/precios#fundadores"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] sm:w-auto"
          >
            Programa Fundadores
          </Link>
        </div>
      </div>
    </section>
  );
}
