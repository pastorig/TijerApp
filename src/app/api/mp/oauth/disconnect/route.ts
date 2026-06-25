import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * POST /api/mp/oauth/disconnect  body { barbershopSlug }
 *
 * Desvincula la cuenta de MercadoPago: limpia las credenciales y desactiva la
 * seña (sin cuenta conectada no se puede cobrar). Solo admin de la barbería.
 */
async function assertAdmin(authHeader: string | null, slug: string) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, error: "No autorizado." };
  }
  const supabase = getSupabaseAdminClient();
  const { data: userResult, error } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (error || !userResult.user) {
    return { ok: false as const, status: 401, error: "Sesión inválida." };
  }
  const { data: adminRow } = await supabase
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", slug)
    .maybeSingle();
  if (!adminRow) {
    return { ok: false as const, status: 403, error: "No sos admin de esta barbería." };
  }
  return { ok: true as const };
}

export async function POST(request: Request) {
  let slug = "";
  try {
    const body = (await request.json()) as { barbershopSlug?: string };
    slug = typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  } catch {
    /* noop */
  }
  if (!slug) {
    return NextResponse.json({ error: "Falta barbershopSlug." }, { status: 400 });
  }

  const auth = await assertAdmin(request.headers.get("authorization"), slug);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("barbershops")
    .update({
      mp_enabled: false,
      mp_access_token: null,
      mp_refresh_token: null,
      mp_public_key: null,
      mp_user_id: null,
      mp_token_expires_at: null,
    })
    .eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: "No pudimos desconectar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
