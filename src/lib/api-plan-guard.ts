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
/**
 * Guard de MODO LECTURA para endpoints de escritura.
 *
 * Cuando el plan de la barbería vence, la barbería queda congelada: se puede
 * leer todo (GET) pero no escribir nada. Este guard corta con 402 cualquier
 * POST/PATCH/PUT/DELETE de una barbería vencida.
 *
 * Se llama DESPUÉS de validar que el usuario es admin de la barbería (igual
 * que assertPlanFeature). NO usar en GET: el barbero vencido tiene que poder
 * ver sus datos.
 *
 * Uso:
 *   const gate = await assertPlanActive(slug);
 *   if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
 */
export async function assertPlanActive(
  barbershopSlug: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const plan = await getBarbershopPlan(barbershopSlug);

  if (plan.isReadOnly) {
    return {
      ok: false,
      status: 402,
      error:
        "Tu plan venció: la barbería está en modo lectura. Activá tu plan para volver a cargar y modificar turnos.",
    };
  }

  return { ok: true };
}

/**
 * Guard de MODO LECTURA para la reserva pública (cliente final).
 *
 * Mismo criterio que assertPlanActive, pero el mensaje va dirigido al cliente
 * de la barbería, no al barbero: no menciona planes ni pagos — eso es un tema
 * entre la barbería y TijerApp, el cliente solo necesita saber que tiene que
 * escribir por WhatsApp.
 */
export async function assertPublicBookingEnabled(
  barbershopSlug: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const plan = await getBarbershopPlan(barbershopSlug);

  if (plan.isReadOnly) {
    return {
      ok: false,
      status: 402,
      error:
        "La reserva online de esta barbería no está disponible por ahora. Escribiles por WhatsApp para sacar tu turno.",
    };
  }

  return { ok: true };
}

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
