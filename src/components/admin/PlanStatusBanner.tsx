"use client";

import Link from "next/link";
import { AlertTriangle, Clock, MessageCircle } from "lucide-react";
import { useCurrentPlan } from "./PlanContext";
import { cn } from "@/lib/cn";
import { FOUNDER, founderWaLink } from "@/lib/founder";
import { PLAN_META, formatArs } from "@/lib/plans";

/**
 * Banner sticky arriba del admin que muestra estado del plan/trial cuando
 * hay algo que comunicar al barbero. 4 estados:
 *
 *  - trial activo, > 3 días restantes → no muestra nada (silencio)
 *  - trial activo, <= 3 días → banner gold con countdown
 *  - en grace period → banner ámbar con "pagá ahora o se cancela"
 *  - expirado/cancelado → no debería llegar acá porque RequirePlan ya
 *    rinde paywall, pero por las dudas mostramos banner danger
 */

type Props = {
  barbershopSlug: string;
};

export function PlanStatusBanner({ barbershopSlug }: Props) {
  const plan = useCurrentPlan();

  const precio = formatArs(PLAN_META[plan.tier].priceArs);
  const waLink = founderWaLink(
    `Hola ${FOUNDER.name}! Soy admin de ${barbershopSlug}. Quiero activar mi plan pago (${precio}/mes).`,
  );

  // Si está active y no expira → silencio
  if (
    plan.effectiveStatus === "active" &&
    (plan.daysToTrialExpire === null || plan.daysToTrialExpire > 3)
  ) {
    return null;
  }

  // Trial activo con countdown <= 3 días
  if (
    plan.effectiveStatus === "active" &&
    plan.daysToTrialExpire !== null &&
    plan.daysToTrialExpire > 0 &&
    plan.daysToTrialExpire <= 3
  ) {
    return (
      <BannerBase tone="gold">
        <Clock className="size-4 shrink-0" />
        <p className="flex-1 text-xs sm:text-sm">
          Tu trial expira en{" "}
          <strong>
            {plan.daysToTrialExpire} día{plan.daysToTrialExpire !== 1 ? "s" : ""}
          </strong>
          . Activá tu plan ({precio}/mes) para seguir usando todas las features.
        </p>
        <WaCta href={waLink} />
      </BannerBase>
    );
  }

  // Grace period
  if (plan.effectiveStatus === "grace") {
    return (
      <BannerBase tone="amber">
        <AlertTriangle className="size-4 shrink-0" />
        <p className="flex-1 text-xs sm:text-sm">
          Tu trial expiró. Estás en período de gracia — la app sigue
          funcionando unos días más. <strong>Activá tu plan ya ({precio}/mes)</strong> antes
          que se cancele.
        </p>
        <WaCta href={waLink} />
      </BannerBase>
    );
  }

  // Expired/cancelled (de respaldo)
  if (
    plan.effectiveStatus === "expired" ||
    plan.effectiveStatus === "cancelled"
  ) {
    return (
      <BannerBase tone="danger">
        <AlertTriangle className="size-4 shrink-0" />
        <p className="flex-1 text-xs sm:text-sm">
          Tu plan está {plan.effectiveStatus === "expired" ? "expirado" : "cancelado"}.
          Activalo ({precio}/mes) para recuperar el acceso completo.
        </p>
        <WaCta href={waLink} />
      </BannerBase>
    );
  }

  return null;
}

function BannerBase({
  tone,
  children,
}: {
  tone: "gold" | "amber" | "danger";
  children: React.ReactNode;
}) {
  const toneClasses = {
    gold: "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
    amber: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    danger:
      "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  };
  return (
    <div
      role="status"
      className={cn(
        "sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b px-4 py-2 sm:px-6",
        toneClasses[tone],
      )}
    >
      {children}
    </div>
  );
}

function WaCta({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-[var(--radius-xs)] border border-current px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-current hover:text-black"
    >
      <MessageCircle className="size-3" />
      Pagar
    </Link>
  );
}
