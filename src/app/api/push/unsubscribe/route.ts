import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { deleteSubscription } from "@/lib/push/subscriptions";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * DELETE /api/push/unsubscribe
 *
 * Borra una push subscription del admin autenticado por endpoint.
 *
 * Body:
 *   { endpoint: string }
 *
 * Headers:
 *   Authorization: Bearer <supabase access token>
 *
 * Returns:
 *   204 — borrada (o no existía)
 *   400 — body inválido
 *   401 — sin auth o token inválido
 *   500 — error inesperado
 */
async function getUserIdFromToken(
  authHeader: string | null,
): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  const accessToken = authHeader.slice("Bearer ".length);
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }
  return { ok: true, userId: data.user.id };
}

export async function DELETE(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const endpoint =
    typeof payload.endpoint === "string" ? payload.endpoint : "";
  if (!endpoint) {
    return NextResponse.json(
      { error: "Falta endpoint." },
      { status: 400 },
    );
  }

  const auth = await getUserIdFromToken(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await deleteSubscription({ userId: auth.userId, endpoint });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "push/unsubscribe" },
    });
    return NextResponse.json(
      { error: "No se pudo eliminar la suscripción." },
      { status: 500 },
    );
  }
}
