import type { ReactNode } from "react";
import { LastContextTracker } from "@/components/pwa/LastContextTracker";
import { getBarbershopPlan } from "@/lib/plan-access";
import { AdminChrome } from "./AdminChrome";
import { PlanProvider, type SerializedPlan } from "./PlanContext";

type AdminShellProps = {
  children: ReactNode;
  barbershopSlug: string;
  barbershopName: string;
};

/**
 * Layout shell para todas las páginas de /[slug]/admin/*.
 * Sidebar fijo en desktop (lg+), drawer colapsable en mobile.
 *
 * Lee el plan de la barbería (server-side) y lo distribuye a children via
 * PlanProvider para que el sidebar pueda filtrar items y los pages puedan
 * mostrar paywalls cuando corresponda.
 */
export async function AdminShell({
  children,
  barbershopSlug,
  barbershopName,
}: AdminShellProps) {
  const plan = await getBarbershopPlan(barbershopSlug);

  // Serializamos para crossing server → client (Date no es serializable)
  const serializedPlan: SerializedPlan = {
    tier: plan.tier,
    rawStatus: plan.rawStatus,
    effectiveStatus: plan.effectiveStatus,
    trialExpiresAtIso: plan.trialExpiresAt?.toISOString() ?? null,
    daysToTrialExpire: plan.daysToTrialExpire,
    graceExpiresAtIso: plan.graceExpiresAt?.toISOString() ?? null,
    paidUntilIso: plan.paidUntil?.toISOString() ?? null,
    daysToPaidExpire: plan.daysToPaidExpire,
    isInGracePeriod: plan.isInGracePeriod,
    canAccessFeatures: plan.canAccessFeatures,
    isReadOnly: plan.isReadOnly,
  };

  return (
    <PlanProvider plan={serializedPlan}>
      {/* PWA: registra que el usuario está en el admin de esta barbería
          para que al abrir la PWA del home screen lo traiga acá. */}
      <LastContextTracker slug={barbershopSlug} role="admin" />

      <AdminChrome
        barbershopSlug={barbershopSlug}
        barbershopName={barbershopName}
      >
        {children}
      </AdminChrome>
    </PlanProvider>
  );
}
