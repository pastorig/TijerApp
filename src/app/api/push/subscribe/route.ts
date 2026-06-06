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
    // Upsert la subscription nueva (por unique constraint user_id+endpoint).
    // Si el mismo device se re-suscribe (mismo endpoint), update lo existente.
    // Si es un device nuevo, crea row nuevo SIN tocar las subs de otros devices.
    const row = await insertSubscription({
      barbershopSlug,
      userId: auth.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    });

    // NOTA: NO hacemos autocleanup destructivo acá. Antes había código que
    // marcaba como expired TODAS las subs del user+barbería con endpoint
    // distinto al actual, asumiendo que solo había 1 device por user. Eso
    // estaba MAL: si el barbero activa notifs desde PC y luego desde su
    // celular, ambos deben recibir notifs. El autocleanup mataba al primero.
    //
    // El cleanup de subs muertas se hace de forma pasiva y segura en 2 lados:
    //   1. En /lib/push/sender.ts: cuando una notif devuelve HTTP 410 Gone,
    //      marcamos expired_at=now() para esa sub específica.
    //   2. En el cron de /api/push/cleanup (hourly via GitHub Actions):
    //      borra rows con expired_at > 30 días.
    // De esta forma cada device tiene su sub propia hasta que el push service
    // confirma que está muerta. Y un user puede tener 1..N devices recibiendo
    // notifs sin pisarse entre sí.

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
