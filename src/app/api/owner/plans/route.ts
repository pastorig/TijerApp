import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { PlanTier, SubscriptionStatus } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * /api/owner/plans — solo accesible para platform_owners.
 *
 *   GET → { plans: Array<{barbershop_slug, name, plan_tier, status, trial_*, ...}> }
 *   PATCH body { barbershopSlug, plan_tier?, status?, trial_expires_at?, grace_expires_at?, notes? }
 *     → { ok, updated }
 *
 * Si la barbería NO tiene fila en barbershop_subscriptions, PATCH la crea.
 */

async function assertPlatformOwner(authHeader: string | null): Promise<
  | { ok: true; ownerId: string }
  | { ok: false; status: number; error: string }
> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  const supabase = getSupabaseAdminClient();
  const { data: userResult } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (!userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }
  const { data: ownerRow } = await supabase
    .from("platform_owners")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .maybeSingle();
  if (!ownerRow) {
    return {
      ok: false,
      status: 403,
      error: "Solo el owner de TijerApp puede acceder.",
    };
  }
  return { ok: true, ownerId: userResult.user.id };
}

export async function GET(request: Request) {
  const auth = await assertPlatformOwner(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdminClient();

  // Join virtual: traemos todas las barberías + su sub (LEFT JOIN-ish vía 2 queries).
  // Más simple que un RPC custom.
  const { data: barbershops, error: bsError } = await supabase
    .from("barbershops")
    .select("slug, name, is_active, created_at")
    .order("created_at", { ascending: false });

  if (bsError) {
    Sentry.captureException(bsError, {
      tags: { route: "owner/plans", step: "list barbershops" },
    });
    return NextResponse.json(
      { error: "No pudimos cargar barberías." },
      { status: 500 },
    );
  }

  const slugs = (barbershops ?? []).map(
    (b) => (b as { slug: string }).slug,
  );
  const { data: subs } = await supabase
    .from("barbershop_subscriptions")
    .select(
      "barbershop_slug, plan_tier, status, trial_started_at, trial_expires_at, grace_expires_at, current_period_ends_at, notes, updated_at",
    )
    .in("barbershop_slug", slugs);

  type SubRow = {
    barbershop_slug: string;
    plan_tier: PlanTier;
    status: SubscriptionStatus;
    trial_started_at: string | null;
    trial_expires_at: string | null;
    grace_expires_at: string | null;
    current_period_ends_at: string | null;
    notes: string | null;
    updated_at: string;
  };
  const subBySlug = new Map<string, SubRow>();
  for (const s of (subs ?? []) as SubRow[]) {
    subBySlug.set(s.barbershop_slug, s);
  }

  const plans = (barbershops ?? []).map((b) => {
    const bs = b as { slug: string; name: string; is_active: boolean };
    const sub = subBySlug.get(bs.slug);
    return {
      slug: bs.slug,
      name: bs.name,
      is_active: bs.is_active,
      plan_tier: sub?.plan_tier ?? null,
      status: sub?.status ?? null,
      trial_started_at: sub?.trial_started_at ?? null,
      trial_expires_at: sub?.trial_expires_at ?? null,
      grace_expires_at: sub?.grace_expires_at ?? null,
      current_period_ends_at: sub?.current_period_ends_at ?? null,
      notes: sub?.notes ?? null,
      updated_at: sub?.updated_at ?? null,
    };
  });

  return NextResponse.json({ plans });
}

export async function PATCH(request: Request) {
  const auth = await assertPlatformOwner(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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

  const update: Record<string, unknown> = {
    assigned_by_owner_id: auth.ownerId,
  };

  const validTiers: PlanTier[] = ["solo", "esencial", "pro"];
  if (typeof body.plan_tier === "string") {
    const tier = body.plan_tier as PlanTier;
    if (validTiers.includes(tier)) {
      update.plan_tier = tier;
    }
  }

  const validStatuses: SubscriptionStatus[] = [
    "trial",
    "active",
    "grace",
    "expired",
    "cancelled",
  ];
  if (
    typeof body.status === "string" &&
    validStatuses.includes(body.status as SubscriptionStatus)
  ) {
    update.status = body.status;
  }

  if ("trial_expires_at" in body) {
    update.trial_expires_at =
      typeof body.trial_expires_at === "string" ? body.trial_expires_at : null;
  }
  if ("grace_expires_at" in body) {
    update.grace_expires_at =
      typeof body.grace_expires_at === "string" ? body.grace_expires_at : null;
  }
  if ("notes" in body) {
    update.notes = typeof body.notes === "string" ? body.notes : null;
  }

  // Si pasaron trialDays como atajo, computamos las dos fechas
  if (
    typeof body.trialDays === "number" &&
    body.trialDays > 0 &&
    body.trialDays < 365
  ) {
    const now = new Date();
    const trialMs = body.trialDays * 24 * 60 * 60 * 1000;
    const graceMs = 7 * 24 * 60 * 60 * 1000;
    update.trial_started_at = now.toISOString();
    update.trial_expires_at = new Date(
      now.getTime() + trialMs,
    ).toISOString();
    update.grace_expires_at = new Date(
      now.getTime() + trialMs + graceMs,
    ).toISOString();
    if (!update.status) update.status = "trial";
  }

  // INVARIANTE: si status pasa a 'active' (pagado), limpiar trial dates.
  // Sin esto la UI muestra inconsistencia "Activo (pagado) · 14d restantes".
  if (update.status === "active") {
    update.trial_expires_at = null;
    update.grace_expires_at = null;
    if (!update.current_period_started_at) {
      update.current_period_started_at = new Date().toISOString();
    }
  }
  // Si status pasa a 'expired' o 'cancelled', tampoco tiene sentido mostrar
  // trial activo — el plan está apagado, las fechas son históricas.
  if (update.status === "expired" || update.status === "cancelled") {
    // Conservamos trial_expires_at como histórico pero podríamos limpiar
    // grace_expires_at si quisiéramos. Por ahora mantenemos histórico.
  }

  const supabase = getSupabaseAdminClient();

  const { data: upsertData, error } = await supabase
    .from("barbershop_subscriptions")
    .upsert(
      {
        barbershop_slug: barbershopSlug,
        ...update,
      } as never,
      { onConflict: "barbershop_slug" },
    )
    .select();

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "owner/plans", step: "upsert" },
    });
    return NextResponse.json(
      { error: "No pudimos actualizar el plan." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, updated: upsertData?.[0] });
}
