import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { computeNextPaidUntil } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * POST /api/owner/register-payment — solo platform owner.
 *
 * Registra un pago manual (transferencia) de una barbería y, atómicamente,
 * extiende su período pago (current_period_ends_at) +1 mes desde max(hoy,
 * vencimiento vigente) y la pone en 'active'. Ver spec 007-cobro-barberos.
 *
 * Body: { slug, amount, method, note? }
 */

const VALID_METHODS = ["transferencia", "efectivo", "otro"] as const;

async function assertPlatformOwner(
  authHeader: string | null,
): Promise<
  | { ok: true; ownerId: string }
  | { ok: false; status: number; error: string }
> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  const supabase = getSupabaseAdminClient();
  const { data: userResult } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (!userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }
  const { data: ownerRow } = await supabase
    .from("platform_owners")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .maybeSingle();
  if (!ownerRow) {
    return {
      ok: false,
      status: 403,
      error: "Solo el owner de TijerApp puede acceder.",
    };
  }
  return { ok: true, ownerId: userResult.user.id };
}

export async function POST(request: Request) {
  const auth = await assertPlatformOwner(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const amount = typeof body.amount === "number" ? body.amount : NaN;
  const method = typeof body.method === "string" ? body.method : "";
  const note =
    typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!slug) {
    return NextResponse.json({ error: "Falta la barbería." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
  }
  if (!(VALID_METHODS as readonly string[]).includes(method)) {
    return NextResponse.json({ error: "Método inválido." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: sub, error: subError } = await supabase
    .from("barbershop_subscriptions")
    .select("current_period_ends_at")
    .eq("barbershop_slug", slug)
    .maybeSingle();

  if (subError) {
    Sentry.captureException(subError, {
      tags: { route: "owner/register-payment", step: "read sub" },
    });
    return NextResponse.json(
      { error: "No pudimos leer la suscripción." },
      { status: 500 },
    );
  }
  if (!sub) {
    return NextResponse.json(
      { error: "No encontramos esa barbería. Configurá su plan primero." },
      { status: 404 },
    );
  }

  const now = new Date();
  const currentEndsRaw = (sub as { current_period_ends_at: string | null })
    .current_period_ends_at;
  const current = currentEndsRaw ? new Date(currentEndsRaw) : null;
  const periodStart =
    current && current.getTime() > now.getTime() ? current : now;
  const periodEnd = computeNextPaidUntil(now, current);

  const { data: payment, error } = await supabase.rpc(
    "register_barbershop_payment" as never,
    {
      p_slug: slug,
      p_amount: amount,
      p_method: method,
      p_period_start: periodStart.toISOString(),
      p_period_end: periodEnd.toISOString(),
      p_note: note,
      p_registered_by: auth.ownerId,
    } as never,
  );

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "owner/register-payment", step: "rpc" },
    });
    return NextResponse.json(
      { error: "No pudimos registrar el pago. Probá de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    pagadoHasta: periodEnd.toISOString(),
    payment,
  });
}
