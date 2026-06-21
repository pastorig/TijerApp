import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPreferenceInitPoint } from "@/lib/mercadopago/client";

export const runtime = "nodejs";

/**
 * GET /api/mp/pay?token=<confirmation_token>
 *
 * URL estable para pagar/reintentar la seña de un turno. Reconstruye el
 * init_point de la preference desde MercadoPago (no guardamos el link en DB)
 * y redirige al checkout. Se usa desde /r/[token] y desde el recordatorio.
 *
 * Si la seña ya no está pendiente o el turno venció, redirige a la vista del
 * turno con un mensaje en vez de mandar a pagar algo inválido.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const base = (process.env.NEXT_PUBLIC_SITE_URL || url.origin).replace(/\/$/, "");

  if (!token) {
    return NextResponse.redirect(`${base}/`);
  }

  const supabase = getSupabaseAdminClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("barbershop_slug, deposit_status, mp_preference_id, deposit_expires_at")
    .eq("confirmation_token", token)
    .maybeSingle();

  const row = appt as {
    barbershop_slug: string;
    deposit_status: string | null;
    mp_preference_id: string | null;
    deposit_expires_at: string | null;
  } | null;

  const detailUrl = `${base}/r/${token}`;

  // Nada que pagar (ya pagada, expirada, o sin preference).
  if (!row || row.deposit_status !== "pending" || !row.mp_preference_id) {
    return NextResponse.redirect(detailUrl);
  }
  if (row.deposit_expires_at && new Date(row.deposit_expires_at) < new Date()) {
    return NextResponse.redirect(detailUrl);
  }

  const { data: shop } = await supabase
    .from("barbershops")
    .select("mp_access_token")
    .eq("slug", row.barbershop_slug)
    .maybeSingle();
  const accessToken = (shop as { mp_access_token?: string | null } | null)
    ?.mp_access_token;
  if (!accessToken) {
    return NextResponse.redirect(detailUrl);
  }

  const result = await getPreferenceInitPoint(accessToken, row.mp_preference_id);
  if (!result.ok) {
    return NextResponse.redirect(detailUrl);
  }

  return NextResponse.redirect(result.initPoint);
}
