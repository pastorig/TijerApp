"use client";

import { useState } from "react";
import { AlertTriangle, Clock, MessageCircle, X } from "lucide-react";
import { useCurrentPlan } from "./PlanContext";
import { cn } from "@/lib/cn";
import { founderWaLink } from "@/lib/founder";
import { PLAN_META, formatArs } from "@/lib/plans";
import { TransferDetailsCard } from "./TransferDetailsCard";

/**
 * Banner sticky arriba del admin que muestra estado del plan/trial cuando
 * hay algo que comunicar al barbero. 4 estados:
 *
 *  - trial activo, > 3 días restantes → no muestra nada (silencio)
 *  - trial activo, <= 3 días → banner gold con countdown
 *  - en grace period → banner ámbar con "pagá ahora o se cancela"
 *  - expirado/cancelado → no debería llegar acá porque RequirePlan ya
 *    rinde paywall, pero por las dudas mostramos banner danger
 *
 * El botón "Pagar" abre un modal con los datos de transferencia (monto +
 * alias/CBU/titular) reusando TransferDetailsCard — así el barbero ve a dónde
 * transferir desde acá, igual que en el paywall de plan vencido.
 */

type Props = {
  barbershopSlug: string;
};

export function PlanStatusBanner({ barbershopSlug }: Props) {
  const plan = useCurrentPlan();
  const [payOpen, setPayOpen] = useState(false);

  const precio = formatArs(PLAN_META[plan.tier].priceArs);
  const waLink = founderWaLink(
    `¡Hola! Soy admin de ${barbershopSlug}. Quiero activar mi plan pago (${precio}/mes).`,
  );

  let banner: React.ReactNode = null;

  // Silencio: active y sin countdown cercano
  if (
    plan.effectiveStatus === "active" &&
    (plan.daysToTrialExpire === null || plan.daysToTrialExpire > 3)
  ) {
    banner = null;
  } else if (
    // Trial activo con countdown <= 3 días
    plan.effectiveStatus === "active" &&
    plan.daysToTrialExpire !== null &&
    plan.daysToTrialExpire > 0 &&
    plan.daysToTrialExpire <= 3
  ) {
    banner = (
      <BannerBase tone="gold">
        <Clock className="size-4 shrink-0" />
        <p className="flex-1 text-xs sm:text-sm">
          Tu trial expira en{" "}
          <strong>
            {plan.daysToTrialExpire} día{plan.daysToTrialExpire !== 1 ? "s" : ""}
          </strong>
          . Activá tu plan ({precio}/mes) para seguir usando todas las features.
        </p>
        <PayCta onClick={() => setPayOpen(true)} />
      </BannerBase>
    );
  } else if (plan.effectiveStatus === "grace") {
    // Grace period
    banner = (
      <BannerBase tone="amber">
        <AlertTriangle className="size-4 shrink-0" />
        <p className="flex-1 text-xs sm:text-sm">
          Tu trial expiró. Estás en período de gracia — la app sigue
          funcionando unos días más.{" "}
          <strong>Activá tu plan ya ({precio}/mes)</strong> antes que se
          cancele.
        </p>
        <PayCta onClick={() => setPayOpen(true)} />
      </BannerBase>
    );
  } else if (
    // Expired/cancelled (de respaldo)
    plan.effectiveStatus === "expired" ||
    plan.effectiveStatus === "cancelled"
  ) {
    banner = (
      <BannerBase tone="danger">
        <AlertTriangle className="size-4 shrink-0" />
        <p className="flex-1 text-xs sm:text-sm">
          Tu plan está{" "}
          {plan.effectiveStatus === "expired" ? "expirado" : "cancelado"}.
          Activalo ({precio}/mes) para recuperar el acceso completo.
        </p>
        <PayCta onClick={() => setPayOpen(true)} />
      </BannerBase>
    );
  }

  if (!banner) return null;

  return (
    <>
      {banner}
      <PayModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        precio={precio}
        waLink={waLink}
      />
    </>
  );
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
        "flex flex-wrap items-center gap-3 border-b px-4 py-2 sm:px-6",
        toneClasses[tone],
      )}
    >
      {children}
    </div>
  );
}

function PayCta({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-[var(--radius-xs)] border border-current px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-current hover:text-black"
    >
      <MessageCircle className="size-3" />
      Pagar
    </button>
  );
}

/**
 * Modal con los datos de transferencia para activar el plan. Se abre desde el
 * botón "Pagar" del banner. El botón de WhatsApp queda como acción secundaria
 * para avisar el pago.
 */
function PayModal({
  open,
  onClose,
  precio,
  waLink,
}: {
  open: boolean;
  onClose: () => void;
  precio: string;
  waLink: string;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Activar plan pago"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
              Activar plan
            </p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">
              Pagá por transferencia
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-[var(--radius-xs)] border border-[color:var(--border-default)] p-1.5 text-[color:var(--text-muted)] transition-colors hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            <X className="size-4" />
          </button>
        </header>

        <TransferDetailsCard precio={precio} />

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors hover:brightness-110"
        >
          <MessageCircle className="size-4" />
          Avisar por WhatsApp
        </a>
      </div>
    </div>
  );
}
