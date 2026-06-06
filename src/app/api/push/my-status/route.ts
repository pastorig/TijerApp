import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * GET /api/push/my-status?barbershopSlug=<slug>
 *
 * Devuelve si el user autenticado TUVO una subscription activa en esa
 * barbería. Sirve para detectar la situación "permission granted en el
 * browser pero subscription perdida tras deploy" — si el server confirma
 * que había una activa, el cliente intenta re-suscribir silenciosamente.
 *
 * Returns:
 *   200 { hadActiveSubscription: boolean, activeCount: number }
 *   401 { error } — sin auth
 *   400 { error } — falta barbershopSlug
 */
async function getUserIdFromToken(
  authHeader: string | null,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }
> {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barbershopSlug = searchParams.get("barbershopSlug");

  if (!barbershopSlug) {
    return NextResponse.json(
      { error: "Falta barbershopSlug." },
      { status: 400 },
    );
  }

  const auth = await getUserIdFromToken(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const { count, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.userId)
    .eq("barbershop_slug", barbershopSlug)
    .is("expired_at", null);

  if (error) {
    return NextResponse.json(
      { error: "Error consultando suscripciones." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    hadActiveSubscription: (count ?? 0) > 0,
    activeCount: count ?? 0,
  });
}
