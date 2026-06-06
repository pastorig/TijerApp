import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { insertSubscription } from "@/lib/push/subscriptions";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * POST /api/push/subscribe
 *
 * Crea (o actualiza) una push subscription para el admin autenticado.
 *
 * Body:
 *   {
 *     barbershopSlug: string,
 *     subscription: {
 *       endpoint: string,
 *       keys: { p256dh: string, auth: string }
 *     },
 *     userAgent?: string
 *   }
 *
 * Headers:
 *   Authorization: Bearer <supabase access token>
 *
 * Returns:
 *   201 { id: string } — subscription creada o actualizada
 *   400 { error } — body inválido
 *   401 { error } — sin auth o token inválido
 *   403 { error } — admin de otra barbería
 *   500 { error } — error inesperado
 */
async function assertAdminOfBarbershop(
  authHeader: string | null,
  barbershopSlug: string,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }
> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  const accessToken = authHeader.slice("Bearer ".length);
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }

  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();

  if (adminError) {
    return { ok: false, status: 500, error: "Error validando permisos." };
  }
  if (!adminRow) {
    return { ok: false, status: 403, error: "No sos admin de esta barbería." };
  }
  return { ok: true, userId: userResult.user.id };
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  const subscription = payload.subscription as
    | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    | undefined;
  const userAgent =
    typeof payload.userAgent === "string" ? payload.userAgent : null;

  if (!barbershopSlug) {
    return NextResponse.json(
      { error: "Falta barbershopSlug." },
      { status: 400 },
    );
  }
  if (
    !subscription ||
    typeof subscription.endpoint !== "string" ||
    !subscription.keys ||
    typeof subscription.keys.p256dh !== "string" ||
    typeof subscription.keys.auth !== "string"
  ) {
    return NextResponse.json(
      { error: "Subscription inválida (faltan endpoint o keys)." },
      { status: 400 },
    );
  }

  const auth = await assertAdminOfBarbershop(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // 1. Upsert la subscription nueva (por unique constraint user_id+endpoint)
    const row = await insertSubscription({
      barbershopSlug,
      userId: auth.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    });

    // 2. Autocleanup: marcar como expired las subs viejas del mismo
    //    user+barbería con endpoints DISTINTOS al actual. Esto evita
    //    huérfanas tras un deploy que invalida el SW y crea endpoint
    //    nuevo, sin necesidad de borrar manualmente desde SQL.
    const supabaseAdmin = getSupabaseAdminClient();
    const { error: cleanupError } = await supabaseAdmin
      .from("push_subscriptions")
      .update({ expired_at: new Date().toISOString() })
      .eq("user_id", auth.userId)
      .eq("barbershop_slug", barbershopSlug)
      .is("expired_at", null)
      .neq("endpoint", subscription.endpoint);

    if (cleanupError) {
      // No es fatal: la nueva sub ya está. Solo log para tracking.
      Sentry.captureException(cleanupError, {
        tags: { route: "push/subscribe", step: "autocleanup", barbershopSlug },
      });
    }

    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "push/subscribe", barbershopSlug },
    });
    return NextResponse.json(
      { error: "No se pudo guardar la suscripción." },
      { status: 500 },
    );
  }
}
