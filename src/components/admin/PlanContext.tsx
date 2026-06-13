"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PlanTier } from "@/lib/plans";

/**
 * Plan context — distribuye el plan resuelto de la barbería actual a todos
 * los componentes client del admin. El server (AdminShell) lo lee de DB
 * con getBarbershopPlan() y lo pasa via este provider.
 *
 * Re-serializamos las Date como ISO strings porque el server→client crossing
 * de Next.js requiere serializable props.
 */

export type SerializedPlan = {
  tier: PlanTier;
  rawStatus: "trial" | "active" | "grace" | "expired" | "cancelled";
  effectiveStatus: "active" | "grace" | "expired" | "cancelled";
  trialExpiresAtIso: string | null;
  daysToTrialExpire: number | null;
  graceExpiresAtIso: string | null;
  isInGracePeriod: boolean;
  canAccessFeatures: boolean;
};

const PlanContext = createContext<SerializedPlan | null>(null);

export function PlanProvider({
  plan,
  children,
}: {
  plan: SerializedPlan;
  children: ReactNode;
}) {
  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>;
}

export function useCurrentPlan(): SerializedPlan {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    // Default seguro: si por error un componente client llama usePlan() fuera
    // del provider, devolvemos un plan permisivo (Pro activo). Mejor que
    // crashear y mostrar pantalla blanca.
    return {
      tier: "pro",
      rawStatus: "active",
      effectiveStatus: "active",
      trialExpiresAtIso: null,
      daysToTrialExpire: null,
      graceExpiresAtIso: null,
      isInGracePeriod: false,
      canAccessFeatures: true,
    };
  }
  return ctx;
}
