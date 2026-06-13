import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  resolvePlanStatus,
  type PlanTier,
  type ResolvedPlan,
  type SubscriptionStatus,
} from "@/lib/plans";

/**
 * Lee el plan de una barbería desde DB y devuelve el ResolvedPlan computado
 * (con effectiveStatus, trial countdown, etc).
 *
 * Si la barbería NO tiene fila en barbershop_subscriptions, devuelve un
 * default seguro: Pro trial 14d desde now. Esto cubre el caso de barberías
 * viejas que se cargaron antes de este sistema o seeds que no tienen sub.
 *
 * Uso desde server components / endpoints:
 *   const plan = await getBarbershopPlan(slug);
 *   if (!plan.canAccessFeatures) ...
 *   if (!hasFeature(plan.tier, 'cupones')) ...
 */
export async function getBarbershopPlan(
  barbershopSlug: string,
): Promise<ResolvedPlan> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("barbershop_subscriptions")
    .select(
      "plan_tier, status, trial_expires_at, grace_expires_at",
    )
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();

  if (error || !data) {
    // Default seguro: Pro trial 14d desde now (en memoria, no se persiste)
    const trialExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const graceExpiresAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    return resolvePlanStatus({
      tier: "pro",
      rawStatus: "trial",
      trialExpiresAt,
      graceExpiresAt,
    });
  }

  type Row = {
    plan_tier: PlanTier;
    status: SubscriptionStatus;
    trial_expires_at: string | null;
    grace_expires_at: string | null;
  };
  const row = data as Row;

  return resolvePlanStatus({
    tier: row.plan_tier,
    rawStatus: row.status,
    trialExpiresAt: row.trial_expires_at ? new Date(row.trial_expires_at) : null,
    graceExpiresAt: row.grace_expires_at ? new Date(row.grace_expires_at) : null,
  });
}

/**
 * Convenience: lee el plan + chequea una feature. Útil en guards de page.tsx.
 */
export async function barbershopHasFeature(
  barbershopSlug: string,
  feature: import("@/lib/plans").Feature,
): Promise<boolean> {
  const plan = await getBarbershopPlan(barbershopSlug);
  if (!plan.canAccessFeatures) return false;
  const { hasFeature } = await import("@/lib/plans");
  return hasFeature(plan.tier, feature);
}
