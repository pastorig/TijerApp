import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { buildAuthorizationUrl, isOAuthConfigured } from "@/lib/mercadopago/oauth";

export const runtime = "nodejs";

/**
 * POST /api/mp/oauth/start  body { barbershopSlug }
 *
 * Inicia la conexión OAuth. Valida que quien llama sea admin de la barbería
 * y devuelve la URL de autorización de MercadoPago (con state firmado). El
 * cliente hace window.location = authUrl.
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
  if (!isOAuthConfigured()) {
    return NextResponse.json(
      { error: "La conexión con MercadoPago no está configurada en la plataforma." },
      { status: 503 },
    );
  }

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

  // El redirect_uri DEBE coincidir exactamente con el registrado en la app de
  // MercadoPago. Usamos NEXT_PUBLIC_SITE_URL (https://tijerapp.com) para que sea
  // determinístico y no dependa de cómo Vercel resuelva el host del request.
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  ).replace(/\/$/, "");
  const redirectUri = `${base}/api/mp/oauth/callback`;
  const authUrl = buildAuthorizationUrl(slug, redirectUri);

  return NextResponse.json({ ok: true, authUrl });
}
