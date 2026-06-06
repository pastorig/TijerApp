import Link from "next/link";
import { ArrowUpRight, Check, Crown } from "lucide-react";
import { cn } from "@/lib/cn";

type TeaserPlan = {
  name: string;
  tagline: string;
  monthlyUsd: number;
  highlight: boolean;
  features: string[];
};

const TEASER_PLANS: TeaserPlan[] = [
  {
    name: "Solo",
    tagline: "Barbero independiente",
    monthlyUsd: 10,
    highlight: false,
    features: [
      "1 barbero",
      "Reservas ilimitadas",
      "Recordatorios automáticos",
    ],
  },
  {
    name: "Esencial",
    tagline: "Barbería con 2+ sillones",
    monthlyUsd: 20,
    highlight: true,
    features: [
      "Multi-barbero ilimitado",
      "Lista de espera",
      "Reportes completos + analytics",
    ],
  },
  {
    name: "Pro",
    tagline: "Para crecer en serio",
    monthlyUsd: 40,
    highlight: false,
    features: [
      "Push en tiempo real",
      "Cupones + fidelización",
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
            Cobramos en pesos al TC MEP del mes. 7 días gratis sin tarjeta.
            Cancelás cuando quieras.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5">
          {TEASER_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] p-5 sm:p-6",
                plan.highlight
                  ? "border-[color:var(--brand-gold)]/40 ring-1 ring-[color:var(--brand-gold)]/30"
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
                  USD {plan.monthlyUsd}
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
