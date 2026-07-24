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
  paidUntilIso: string | null;
  daysToPaidExpire: number | null;
  isInGracePeriod: boolean;
  canAccessFeatures: boolean;
  /** True si la barbería está en modo lectura (plan vencido): puede ver, no escribir. */
  isReadOnly: boolean;
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

/**
 * Motivo que se muestra (title/tooltip) en cada control deshabilitado por
 * modo lectura. Uno solo para toda la app: el barbero tiene que leer siempre
 * la misma explicación, no cinco variantes.
 */
export const READ_ONLY_REASON =
  "Tu plan venció: la barbería está en modo lectura. Activá tu plan para volver a editar.";

/**
 * Azúcar sobre useCurrentPlan() para el caso más común en la UI del admin:
 * "¿puedo escribir?". El candado de verdad vive en el server
 * (assertPlanActive); esto es para que la UI no ofrezca lo que va a rebotar.
 */
export function useIsReadOnly(): boolean {
  return useCurrentPlan().isReadOnly;
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
      paidUntilIso: null,
      daysToPaidExpire: null,
      isInGracePeriod: false,
      canAccessFeatures: true,
      isReadOnly: false,
    };
  }
  return ctx;
}
