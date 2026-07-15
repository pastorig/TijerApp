import "server-only";

import { getBarbershopPlan } from "@/lib/plan-access";
import { hasFeature, type Feature } from "@/lib/plans";

/**
 * Guard server-side de plan para endpoints de API.
 *
 * Hasta ahora el gating de features Pro/Esencial vivía SOLO en la UI
 * (sidebar + <RequirePlan>), así que un admin de un plan inferior podía
 * pegarle directo a los endpoints (ej. POST /api/admin/loyalty) y usar la
 * feature igual. Este guard cierra ese agujero: se llama DESPUÉS de validar
 * que el usuario es admin de la barbería, y corta si el plan no incluye la
 * feature (o está vencido).
 *
 * Uso:
 *   const gate = await assertPlanFeature(slug, "fidelizacion");
 *   if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
 */
export async function assertPlanFeature(
  barbershopSlug: string,
  feature: Feature,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const plan = await getBarbershopPlan(barbershopSlug);

  if (!plan.canAccessFeatures) {
    return {
      ok: false,
      status: 402,
      error:
        "Tu suscripción está vencida. Renovala para volver a usar esta función.",
    };
  }

  if (!hasFeature(plan.tier, feature)) {
    return {
      ok: false,
      status: 403,
      error: "Tu plan actual no incluye esta función. Mejorá tu plan para usarla.",
    };
  }

  return { ok: true };
}
