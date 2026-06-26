import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  exchangeCodeForToken,
  expiresAtFrom,
  verifyState,
} from "@/lib/mercadopago/oauth";

export const runtime = "nodejs";

/**
 * GET /api/mp/oauth/callback?code=&state=
 *
 * MercadoPago redirige acá tras autorizar. Verificamos el state (firmado),
 * intercambiamos el code por las credenciales de la barbería y las guardamos.
 * Después volvemos a la pantalla de cobros con un flag de resultado.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  // Base determinística (debe matchear el redirect_uri del start y el
  // registrado en MercadoPago). Preferimos NEXT_PUBLIC_SITE_URL.
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL || url.origin
  ).replace(/\/$/, "");

  function redirectCobros(slug: string, status: "connected" | "error", reason?: string) {
    const u = new URL(`${origin}/${slug}/admin/cobros`);
    u.searchParams.set("mp", status);
    if (reason) u.searchParams.set("reason", reason);
    return NextResponse.redirect(u.toString());
  }

  const stateCheck = state ? verifyState(state) : { ok: false as const, reason: "sin state" };
  if (!stateCheck.ok) {
    // Sin slug confiable no podemos volver a una barbería; vamos al home.
    return NextResponse.redirect(`${origin}/?mp=error`);
  }
  const slug = stateCheck.slug;

  // MP puede mandar error=access_denied si el usuario canceló.
  const mpError = url.searchParams.get("error");
  if (mpError || !code) {
    return redirectCobros(slug, "error", mpError || "sin_code");
  }

  const redirectUri = `${origin}/api/mp/oauth/callback`;
  const supabase = getSupabaseAdminClient();
  const result = await exchangeCodeForToken(code, redirectUri);
  if (!result.ok) {
    // El `code` de OAuth es de un solo uso. MercadoPago (o el browser) a veces
    // pega DOS veces al callback: el primer hit guarda las credenciales y el
    // segundo falla porque el code ya se usó. Si la barbería YA quedó conectada
    // (tiene mp_user_id), tratamos este segundo hit como éxito y NO mostramos
    // un error confuso.
    const { data: already } = await supabase
      .from("barbershops")
      .select("mp_user_id")
      .eq("slug", slug)
      .maybeSingle();
    if ((already as { mp_user_id?: string | null } | null)?.mp_user_id) {
      return redirectCobros(slug, "connected");
    }
    Sentry.captureMessage(`mp oauth exchange failed: ${result.error}`, {
      tags: { route: "mp/oauth/callback" },
    });
    return redirectCobros(slug, "error", "exchange");
  }

  const t = result.token;
  const { error: updateError } = await supabase
    .from("barbershops")
    .update({
      mp_access_token: t.access_token,
      mp_refresh_token: t.refresh_token,
      mp_public_key: t.public_key,
      mp_user_id: String(t.user_id),
      mp_token_expires_at: expiresAtFrom(t.expires_in),
    })
    .eq("slug", slug);

  if (updateError) {
    Sentry.captureException(updateError, { tags: { route: "mp/oauth/callback", step: "save" } });
    return redirectCobros(slug, "error", "save");
  }

  return redirectCobros(slug, "connected");
}
