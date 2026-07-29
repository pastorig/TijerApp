import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { assertPlatformOwner } from "@/lib/owner-api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * GET /api/owner/payments — solo platform owner.
 *
 * Historial de cobros a barberías. La tabla `barbershop_payments` la venía
 * llenando "Registrar pago" desde la feature 007, pero ninguna pantalla la
 * leía: el owner no podía ver qué le pagó cada barbería ni cuándo.
 *
 * `barbershop_payments` tiene RLS sin políticas públicas, así que se lee con el
 * admin client detrás de este gate — nunca desde el navegador.
 *
 * Query params:
 *   ?slug=<barbershop_slug>  filtra por barbería (opcional)
 *   ?limit=<n>               default 50, máximo 200
 *
 * → { payments: Array<{id, barbershop_slug, amount, method, period_start,
 *                      period_end, note, created_at}>, totalAmount }
 */
export async function GET(request: Request) {
  try {
    const auth = await assertPlatformOwner(
      request.headers.get("authorization"),
    );
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 200)
        : 50;

    let query = getSupabaseAdminClient()
      .from("barbershop_payments")
      .select(
        "id, barbershop_slug, amount, method, period_start, period_end, note, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (slug) query = query.eq("barbershop_slug", slug);

    const { data, error } = await query;

    if (error) {
      Sentry.captureException(error);
      return NextResponse.json(
        { error: "No pudimos cargar el historial de cobros." },
        { status: 500 },
      );
    }

    const payments = data ?? [];
    // `amount` es numeric(12,2): PostgREST lo devuelve como string.
    const totalAmount = payments.reduce(
      (sum, payment) => sum + Number(payment.amount ?? 0),
      0,
    );

    return NextResponse.json({ payments, totalAmount });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "No pudimos cargar el historial de cobros." },
      { status: 500 },
    );
  }
}
