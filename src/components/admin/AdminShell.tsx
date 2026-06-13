import type { ReactNode } from "react";
import { LastContextTracker } from "@/components/pwa/LastContextTracker";
import { getBarbershopPlan } from "@/lib/plan-access";
import { AdminSidebar } from "./AdminSidebar";
import { PlanProvider, type SerializedPlan } from "./PlanContext";
import { PlanStatusBanner } from "./PlanStatusBanner";

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
    isInGracePeriod: plan.isInGracePeriod,
    canAccessFeatures: plan.canAccessFeatures,
  };

  return (
    <PlanProvider plan={serializedPlan}>
      <div className="min-h-screen bg-black text-white lg:flex">
        {/* PWA: registra que el usuario está en el admin de esta barbería
            para que al abrir la PWA del home screen lo traiga acá. */}
        <LastContextTracker slug={barbershopSlug} role="admin" />

        <AdminSidebar
          barbershopSlug={barbershopSlug}
          barbershopName={barbershopName}
        />

        <main className="min-w-0 flex-1">
          <PlanStatusBanner barbershopSlug={barbershopSlug} />
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            {children}
          </div>
        </main>
      </div>
    </PlanProvider>
  );
}
