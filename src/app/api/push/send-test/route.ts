import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanFeature } from "@/lib/api-plan-guard";

export const runtime = "nodejs";

/**
 * POST /api/push/send-test
 *
 * Encola un push notification de prueba para TODAS las subs activas del
 * admin autenticado en la barbería indicada.
 *
 * Body:
 *   { barbershopSlug: string }
 *
 * Headers:
 *   Authorization: Bearer <supabase access token>
 *
 * Returns:
 *   200 { enqueued: number } — cantidad de devices encolados
 *   400 — body inválido
 *   401/403 — auth
 *   500 — error inesperado
 *
 * Nota: las notifs no LLEGAN al device hasta que esté implementado el
 * pipeline de envío (Phase 4 / T018 /api/push/send-from-queue). Por ahora
 * sirve para validar que la subscription se enqueua correctamente.
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
  if (!barbershopSlug) {
    return NextResponse.json(
      { error: "Falta barbershopSlug." },
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

  const gate = await assertPlanFeature(barbershopSlug, "push_notifications");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  try {
    // Buscar subs activas del user actual en esta barbería (solo SUS devices)
    const { data: subs, error: subsError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id")
      .eq("barbershop_slug", barbershopSlug)
      .eq("user_id", auth.userId)
      .is("expired_at", null);

    if (subsError) {
      throw new Error(`Error leyendo subs: ${subsError.message}`);
    }

    const subsList = subs ?? [];
    if (subsList.length === 0) {
      return NextResponse.json(
        { enqueued: 0, message: "No hay devices suscriptos." },
        { status: 200 },
      );
    }

    const timestamp = Date.now();
    const payload = {
      title: "Prueba TijerApp",
      body: "Las notificaciones están funcionando ✓",
      url: `/${barbershopSlug}/admin/turnero`,
      tag: `test-${timestamp}`,
    };

    const rows = subsList.map((s) => ({
      subscription_id: s.id,
      payload,
      status: "pending" as const,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("push_notification_queue")
      .insert(rows);

    if (insertError) {
      throw new Error(`Error encolando: ${insertError.message}`);
    }

    return NextResponse.json(
      { enqueued: subsList.length },
      { status: 200 },
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "push/send-test", barbershopSlug },
    });
    return NextResponse.json(
      { error: "No se pudo enviar la notificación de prueba." },
      { status: 500 },
    );
  }
}
