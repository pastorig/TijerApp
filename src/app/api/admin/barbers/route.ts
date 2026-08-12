import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanActive } from "@/lib/api-plan-guard";
import { getBarbershopPlan } from "@/lib/plan-access";
import { PLAN_LIMITS, PLAN_META } from "@/lib/plans";
import type { BarberInsert } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * /api/admin/barbers
 *
 *   POST body { barbershopSlug, name, display_name?, role?, whatsapp?,
 *               commission_percent?, is_active?, is_owner? } → { barber }
 *
 * Por qué existe este endpoint: hasta acá los barberos se creaban desde el
 * browser con la anon key (`createBarber` pegaba directo a la tabla), así que
 * el límite de barberos por plan era puro texto en la landing — nadie lo
 * chequeaba. Cualquiera en Solo podía cargar 10 barberos.
 *
 * Sigue el mismo patrón que el resto de /api/admin/*: validar admin con el
 * service role y recién ahí escribir.
 */

async function assertAdmin(authHeader: string | null, barbershopSlug: string) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, error: "No autorizado." };
  }
  const supabase = getSupabaseAdminClient();
  const { data: userResult } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (!userResult.user) {
    return { ok: false as const, status: 401, error: "Sesión inválida." };
  }
  const { data: adminRow } = await supabase
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();
  if (!adminRow) {
    return {
      ok: false as const,
      status: 403,
      error: "No sos admin de esta barbería.",
    };
  }
  return { ok: true as const, userId: userResult.user.id };
}

/** Mensaje de paywall: dice cuántos tenés, cuál es el tope y a dónde subir. */
function limitReachedMessage(
  tier: keyof typeof PLAN_LIMITS,
  limit: number,
): string {
  const plural = limit === 1 ? "barbero" : "barberos";
  const upgrade =
    tier === "solo"
      ? `Pasá a ${PLAN_META.esencial.name} para sumar hasta ${PLAN_LIMITS.esencial.maxBarbers}.`
      : `Pasá a ${PLAN_META.pro.name} para tener barberos ilimitados.`;
  return `Tu plan ${PLAN_META[tier].name} incluye ${limit} ${plural}. ${upgrade}`;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  if (!barbershopSlug) {
    return NextResponse.json(
      { error: "Falta barbershopSlug." },
      { status: 400 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "El nombre del barbero es obligatorio." },
      { status: 400 },
    );
  }

  const auth = await assertAdmin(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Barbería vencida = modo lectura, no puede cargar barberos nuevos.
  const active = await assertPlanActive(barbershopSlug);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const supabase = getSupabaseAdminClient();

  try {
    const plan = await getBarbershopPlan(barbershopSlug);
    const limit = PLAN_LIMITS[plan.tier].maxBarbers;

    // Se cuentan los no borrados, no solo los activos: un barbero pausado
    // sigue ocupando lugar y se puede reactivar de un click.
    const { count, error: countError } = await supabase
      .from("barbers")
      .select("id", { count: "exact", head: true })
      .eq("barbershop_slug", barbershopSlug)
      .is("deleted_at", null);

    if (countError) throw countError;

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: limitReachedMessage(plan.tier, limit) },
        { status: 403 },
      );
    }

    const insert: BarberInsert = {
      barbershop_slug: barbershopSlug,
      name,
      display_name:
        typeof body.display_name === "string" && body.display_name.trim()
          ? body.display_name.trim()
          : null,
      role:
        typeof body.role === "string" && body.role.trim()
          ? body.role.trim()
          : null,
      whatsapp:
        typeof body.whatsapp === "string" && body.whatsapp.trim()
          ? body.whatsapp.trim()
          : null,
      commission_percent:
        typeof body.commission_percent === "number"
          ? body.commission_percent
          : null,
      is_active: body.is_active !== false,
      is_owner: body.is_owner === true,
    };

    const { data: barber, error } = await supabase
      .from("barbers")
      .insert(insert)
      .select(
        "id, created_at, barbershop_slug, name, display_name, role, whatsapp, is_active, is_owner, deleted_at, commission_percent",
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ barber });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "admin/barbers", method: "POST" },
    });
    return NextResponse.json(
      { error: "No pudimos crear el barbero." },
      { status: 500 },
    );
  }
}
