"use client";

import Link from "next/link";
import { Lock, MessageCircle } from "lucide-react";
import { useCurrentPlan } from "./PlanContext";
import {
  formatArs,
  hasFeature,
  minTierForFeature,
  PLAN_META,
  type Feature,
} from "@/lib/plans";
import { founderWaLink } from "@/lib/founder";
import { TransferDetailsCard } from "./TransferDetailsCard";

/**
 * Wrapper que protege una página/sección según el plan de la barbería.
 *
 * Si el plan del barbero NO incluye la feature, muestra un paywall amistoso
 * en lugar del children. No redirect — para que el barbero entienda qué le
 * faltaría y pueda pedir upgrade.
 *
 * Uso típico al inicio de cada page Pro:
 *   return (
 *     <RequirePlan feature="cupones" barbershopSlug={slug}>
 *       <AdminCouponsManager ... />
 *     </RequirePlan>
 *   );
 */

type Props = {
  feature: Feature;
  barbershopSlug: string;
  children: React.ReactNode;
};

export function RequirePlan({ feature, barbershopSlug, children }: Props) {
  const plan = useCurrentPlan();

  // Si está expired/cancelled, mostramos paywall genérico
  if (!plan.canAccessFeatures) {
    return <ExpiredPaywall barbershopSlug={barbershopSlug} tier={plan.tier} />;
  }

  // Si el plan no incluye la feature, paywall feature-specific
  if (!hasFeature(plan.tier, feature)) {
    return <FeaturePaywall feature={feature} currentTier={plan.tier} />;
  }

  return <>{children}</>;
}

function FeaturePaywall({
  feature,
  currentTier,
}: {
  feature: Feature;
  currentTier: ReturnType<typeof useCurrentPlan>["tier"];
}) {
  const minTier = minTierForFeature(feature);
  const minTierMeta = PLAN_META[minTier];
  const currentTierMeta = PLAN_META[currentTier];
  const featureLabel: Record<Feature, string> = {
    multi_barbero: "Multi-barbero",
    cupones: "Cupones de descuento",
    cobros_online: "Cobros online",
    reportes_pdf: "Reportes en PDF",
    reportes_por_barbero: "Reportes por barbero",
    push_notifications: "Notificaciones push",
    fidelizacion: "Sistema de fidelización",
    multi_admin: "Multi-admin (equipo)",
    reportes_mensuales_email: "Reportes mensuales por email",
    soporte_prioritario: "Soporte prioritario",
  };

  const waLink = founderWaLink(
    `¡Hola! Soy admin de una barbería en TijerApp. Estoy en plan ${currentTierMeta.name} y quiero pasar a ${minTierMeta.name} para usar ${featureLabel[feature]}.`,
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
      <div className="rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--surface-1)] p-8 text-center sm:p-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)]">
          <Lock className="size-6 text-[color:var(--brand-gold)]" />
        </div>

        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Disponible en {minTierMeta.name}
        </p>
        <h1 className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-3xl">
          {featureLabel[feature]}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Tu plan actual ({currentTierMeta.name} · $
          {currentTierMeta.priceArs.toLocaleString("es-AR")}/mes) no incluye
          esta feature. Pasá a{" "}
          <strong className="text-white">
            {minTierMeta.name} (${minTierMeta.priceArs.toLocaleString("es-AR")}
            /mes)
          </strong>{" "}
          para activarla.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gold-grad px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors hover:brightness-110 sm:w-auto"
          >
            <MessageCircle className="size-4" />
            Pedir upgrade por WhatsApp
          </a>
          <Link
            href="../"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-white hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] sm:w-auto"
          >
            Volver al admin
          </Link>
        </div>
      </div>
    </main>
  );
}

function ExpiredPaywall({
  barbershopSlug,
  tier,
}: {
  barbershopSlug: string;
  tier: ReturnType<typeof useCurrentPlan>["tier"];
}) {
  const precio = formatArs(PLAN_META[tier].priceArs);
  const waLink = founderWaLink(
    `¡Hola! Soy admin de ${barbershopSlug} y mi plan venció. Quiero activarlo (${precio}/mes).`,
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
      <div className="rounded-[var(--radius-md)] border border-[color:var(--danger)]/30 bg-[color:var(--surface-1)] p-8 text-center sm:p-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)]">
          <Lock className="size-6 text-[color:var(--danger)]" />
        </div>

        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--danger)]">
          Trial expirado
        </p>
        <h1 className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-3xl">
          Activá tu plan para seguir
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Tu trial gratis terminó. Para seguir usando TijerApp, activá tu plan
          pago. Tus datos (clientes, turnos, configuración) están todos
          guardados — apenas activás, vuelve todo.
        </p>

        {/* Datos de transferencia — cuánto y a dónde */}
        <TransferDetailsCard precio={precio} className="mx-auto mt-6 max-w-sm" />

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gold-grad px-6 text-sm font-bold uppercase tracking-[0.14em] text-black hover:brightness-110 sm:w-auto"
          >
            <MessageCircle className="size-4" />
            Activar plan por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
