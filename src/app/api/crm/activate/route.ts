/**
 * Activación desde crmsaas (contrato de activación v1).
 *
 *   POST /api/crm/activate
 *   Authorization: Bearer ${CRM_ACTIVATE_TOKEN}
 *
 * El CRM registra el pago de una barbería y TijerApp la activa hasta la fecha
 * pagada, en una sola operación (RPC `crm_activate_barbershop`). Pasada esa
 * fecha, `resolvePlanStatus` le da 7 días de gracia y la bloquea: no hace
 * falta nada más de este lado.
 *
 * **Token propio**, distinto del de exportación: quien tenga el de lectura no
 * puede activar a nadie. Sin token configurado se rechaza (503).
 */
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { tokenMatches } from "@/lib/crm-export";
import { parseActivationBody, requestHashOf, rpcErrorResponse } from "@/lib/crm-activate";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerDe(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function POST(request: Request) {
  const esperado = process.env.CRM_ACTIVATE_TOKEN?.trim();
  if (!esperado) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!tokenMatches(esperado, bearerDe(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid", fields: { body: "No es JSON." } },
      { status: 422 },
    );
  }

  const parsed = parseActivationBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid", fields: parsed.fields }, { status: 422 });
  }
  const pedido = parsed.data;

  const { data, error } = await getSupabaseAdminClient().rpc(
    "crm_activate_barbershop" as never,
    {
      p_barbershop_id: pedido.accountExternalId,
      p_command_id: pedido.commandId,
      p_request_hash: requestHashOf(pedido),
      p_amount: pedido.amount,
      p_method: pedido.method,
      p_reference: pedido.reference,
      p_paid_at: pedido.paidAt,
      p_coverage_start: pedido.coverageStart,
      p_coverage_end: pedido.coverageEnd,
    } as never,
  );

  if (error) {
    const conocido = rpcErrorResponse(error.message);
    if (conocido) {
      return NextResponse.json({ error: conocido.error }, { status: conocido.status });
    }
    // Sin detalle hacia afuera: un error de base puede traer fragmentos de consulta.
    Sentry.captureException(error, { tags: { route: "crm/activate", step: "rpc" } });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const resultado = data as { payment_id: string; paid_until: string; replayed: boolean };
  return NextResponse.json({
    paymentId: resultado.payment_id,
    accountExternalId: pedido.accountExternalId,
    status: "active",
    paidUntil: new Date(resultado.paid_until).toISOString(),
    replayed: resultado.replayed,
  });
}
