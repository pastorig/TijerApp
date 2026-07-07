"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Crown, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";

type BillingCycle = "monthly" | "annual";

type Plan = {
  id: "solo" | "esencial" | "pro";
  name: string;
  tagline: string;
  monthlyArs: number;
  annualArs: number;
  highlight: boolean;
  description: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    tagline: "Para barberos independientes",
    monthlyArs: 22000,
    annualArs: 224000,
    highlight: false,
    description:
      "Para el barbero que alquila sillón o trabaja a domicilio. Tu agenda online en menos de 10 minutos.",
    features: [
      "1 barbero (tu cuenta)",
      "Reservas online ilimitadas",
      "URL pública con tu marca",
      "Recordatorios automáticos",
      "Confirmaciones por link sin login",
      "Lista de espera",
      "Clientes + segmentación básica",
      "Reportes operativos básicos",
      "Cierre de caja diario",
      "Galería pública",
      "WhatsApp links integrados",
      "PWA instalable",
    ],
  },
  {
    id: "esencial",
    name: "Esencial",
    tagline: "El plan que la mayoría elige",
    monthlyArs: 41000,
    annualArs: 418000,
    highlight: true,
    description:
      "Para barberías con 2 sillones. Sumás cobro de seña, cupones y reportes por barbero para operar de forma profesional.",
    features: [
      "Todo lo de Solo, más:",
      "Hasta 2 barberos",
      "Cobro de seña online (Mercado Pago)",
      "Cupones de descuento",
      "Reportes por barbero",
      "Reportes con export a PDF",
      "Notificaciones push en tiempo real",
      "Soporte por email prioritario",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para crecer en serio",
    monthlyArs: 61000,
    annualArs: 622000,
    highlight: false,
    description:
      "Para barberías establecidas con varios barberos. Fidelización, equipo multi-admin y reportes mensuales para escalar.",
    features: [
      "Todo lo de Esencial, más:",
      "Barberos ilimitados (3 o más)",
      "Sistema de fidelización (sellos)",
      "Equipo: hasta 5 admins",
      "Reportes mensuales por email",
      "Logo en emails transaccionales",
      "Soporte prioritario por WhatsApp (<24h)",
      "Acceso anticipado a features nuevas",
    ],
  },
];

function formatArs(value: number): string {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

export function PricingPlans() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  function getPrice(plan: Plan): { display: string; perPeriod: string } {
    if (cycle === "monthly") {
      return {
        display: formatArs(plan.monthlyArs),
        perPeriod: "/ mes",
      };
    }
    const monthlyEquiv = plan.annualArs / 12;
    return {
      display: formatArs(monthlyEquiv),
      perPeriod: `/ mes · ${formatArs(plan.annualArs)} al año`,
    };
  }

  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        {/* Toggle Mensual / Anual */}
        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label="Ciclo de facturación"
            className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={cycle === "monthly"}
              onClick={() => setCycle("monthly")}
              className={cn(
                "min-h-9 rounded-[var(--radius-sm)] px-4 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-[var(--duration-fast)]",
                cycle === "monthly"
                  ? "bg-[color:var(--brand-gold)] text-black"
                  : "text-[color:var(--text-secondary)] hover:text-white",
              )}
            >
              Mensual
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={cycle === "annual"}
              onClick={() => setCycle("annual")}
              className={cn(
                "min-h-9 rounded-[var(--radius-sm)] px-4 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-[var(--duration-fast)]",
                cycle === "annual"
                  ? "bg-[color:var(--brand-gold)] text-black"
                  : "text-[color:var(--text-secondary)] hover:text-white",
              )}
            >
              Anual
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider transition-colors",
                  cycle === "annual"
                    ? // Botón activo (fondo gold): badge oscuro para contraste
                      "bg-black/85 text-[color:var(--brand-gold)]"
                    : // Botón inactivo (fondo oscuro): badge gold-soft
                      "bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
                )}
              >
                -15%
              </span>
            </button>
          </div>
        </div>

        {/* Strip explicativa sobre el TC — arriba para que sea visible sin scroll */}
        <div className="mx-auto mt-6 max-w-3xl rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/20 bg-[color:var(--brand-gold-soft)]/30 p-4 sm:mt-8 sm:p-5">
          <p className="text-xs leading-6 text-[color:var(--text-secondary)] sm:text-sm">
            <span className="font-semibold text-white">
              Pagás en pesos, sin sorpresas.
            </span>{" "}
            Precios fijados en pesos argentinos. Sin conversión, sin tipo de
            cambio, sin sorpresas a fin de mes.
          </p>
        </div>

        {/* Hint de scroll en mobile */}
        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)] sm:hidden">
          ← Deslizá para ver los 3 planes →
        </p>

        {/* Grilla de planes — scroll horizontal en mobile, grid en sm+.
            pt-5 en mobile da espacio al badge 'Más elegido' (-top-3) que
            sino lo recorta el overflow-x-auto del contenedor scrolleable. */}
        <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-5 sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 sm:pt-0 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const { display, perPeriod } = getPrice(plan);
            return (
              <Card
                key={plan.id}
                variant={plan.highlight ? "elevated" : "default"}
                padding="md"
                className={cn(
                  "hover-glow relative flex w-[85%] shrink-0 snap-center flex-col sm:w-auto sm:shrink sm:snap-align-none sm:p-8",
                  plan.highlight &&
                    "glow-gold-soft border-[color:var(--brand-gold)]/40 ring-1 ring-[color:var(--brand-gold)]/30",
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--brand-gold)] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-black">
                    Más elegido
                  </div>
                )}

                <header>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                      {plan.name}
                    </h3>
                    {plan.id === "pro" && (
                      <Crown
                        aria-hidden="true"
                        className="size-5 text-[color:var(--brand-gold)]"
                      />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                    {plan.tagline}
                  </p>
                </header>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                    {display}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                  {perPeriod}
                </p>

                <p className="mt-5 text-sm leading-6 text-[color:var(--text-secondary)]">
                  {plan.description}
                </p>

                <ul className="mt-5 space-y-2 sm:mt-6 sm:space-y-2.5">
                  {plan.features.map((feature, idx) => {
                    const isHeader = feature.endsWith(", más:");
                    return (
                      <li
                        key={`${plan.id}-${idx}`}
                        className={cn(
                          "flex items-start gap-2",
                          isHeader && "pt-1",
                        )}
                      >
                        {isHeader ? (
                          <Sparkles
                            aria-hidden="true"
                            className="mt-0.5 size-3.5 shrink-0 text-[color:var(--brand-gold)] sm:size-4"
                          />
                        ) : (
                          <Check
                            aria-hidden="true"
                            className="mt-0.5 size-3.5 shrink-0 text-[color:var(--brand-gold)] sm:size-4"
                          />
                        )}
                        <span
                          className={cn(
                            "text-[13px] leading-5 sm:text-sm sm:leading-6",
                            isHeader
                              ? "font-semibold text-white"
                              : "text-[color:var(--text-secondary)]",
                          )}
                        >
                          {feature}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-8 pt-2">
                  <Button
                    as="link"
                    href="/#contacto"
                    variant={plan.highlight ? "primary" : "secondary"}
                    size="md"
                    fullWidth
                    iconRight={<ArrowUpRight className="size-4" />}
                  >
                    Empezar prueba
                  </Button>
                  <p className="mt-3 text-center text-[10px] text-[color:var(--text-secondary)]">
                    14 días gratis · Sin tarjeta
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

      </div>
    </section>
  );
}

export function FoundersProgram() {
  return (
    <section className="relative isolate overflow-hidden border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--brand-gold) 14%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Programa Fundadores
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Las primeras{" "}
            <span className="text-[color:var(--brand-gold)]">10 barberías</span>
            <br className="hidden sm:block" /> reciben beneficios únicos
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)] sm:text-lg sm:leading-8">
            Si confías en TijerApp en su etapa inicial, te damos beneficios que
            solo vas a tener vos. No es marketing — es nuestra forma de
            agradecerle a quienes apuestan temprano.
          </p>
        </header>

        <ul className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:mt-12 sm:gap-4">
          {[
            {
              title: "Precio congelado 3 meses",
              detail:
                "Pagás el precio del momento durante 3 meses, sin importar si subimos o ajustamos.",
            },
            {
              title: "Upgrade gratis al tier siguiente",
              detail:
                "Si entrás en Esencial, te activamos Pro durante 1 mes. Si entrás en Solo, te subimos a Esencial durante 1 mes.",
            },
            {
              title: "WhatsApp directo conmigo",
              detail:
                "Gino, founder de TijerApp, tu canal directo para feedback, dudas y soporte.",
            },
            {
              title: "Badge Fundador en el panel",
              detail:
                "Tu cuenta queda marcada como Fundador. Reconocimiento permanente.",
            },
            {
              title: "Mención opcional en el sitio",
              detail:
                "Si querés, te incluimos en la sección Fundadores de tijerapp.com con tu marca.",
            },
            {
              title: "Beta tester de features nuevas",
              detail:
                "Accedés 2 semanas antes que el público a cada release nuevo. Tu feedback define el roadmap.",
            },
          ].map((perk) => (
            <li
              key={perk.title}
              className="hover-glow rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-3 sm:p-6"
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-gold)] sm:size-5"
                />
                <div>
                  <h3 className="text-[11px] font-bold uppercase leading-tight tracking-wide text-white sm:text-sm">
                    {perk.title}
                  </h3>
                  <p className="mt-1 hidden text-sm leading-6 text-[color:var(--text-secondary)] sm:block">
                    {perk.detail}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center sm:mt-12">
          <Link
            href="/#contacto"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-7 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110"
          >
            Quiero ser Fundador
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
