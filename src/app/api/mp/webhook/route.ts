import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPayment } from "@/lib/mercadopago/client";

export const runtime = "nodejs";

/**
 * POST /api/mp/webhook?bs=<slug>
 *
 * Recibe las notificaciones de pago de MercadoPago. El `?bs=` nos dice de qué
 * barbería es (para usar su access_token). NO confiamos en el payload: re-
 * consultamos el pago real contra MP. Es idempotente: notificaciones repetidas
 * no confirman el turno ni registran el pago más de una vez.
 *
 * Responde 200 salvo error interno real (MP reintenta ante respuestas no-2xx).
 */

type WebhookBody = {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string | number };
};

async function handle(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("bs") ?? "";

  // El id del pago puede venir en el body (data.id) o en query (data.id / id).
  let paymentId = "";
  let rawBody: WebhookBody | null = null;
  try {
    rawBody = (await request.json()) as WebhookBody;
    if (rawBody?.data?.id != null) paymentId = String(rawBody.data.id);
  } catch {
    /* puede venir sin body (IPN viejo) */
  }
  if (!paymentId) {
    paymentId =
      url.searchParams.get("data.id") || url.searchParams.get("id") || "";
  }

  const eventType = rawBody?.type ?? rawBody?.topic ?? url.searchParams.get("type") ?? "";

  // Solo procesamos notificaciones de pago. Otros topics → 200 y listo.
  if (eventType && !eventType.includes("payment")) {
    return NextResponse.json({ ok: true, ignored: eventType });
  }
  if (!slug || !paymentId) {
    // Sin datos suficientes: 200 para que MP no reintente infinito.
    return NextResponse.json({ ok: true, skipped: "missing bs or paymentId" });
  }

  const supabase = getSupabaseAdminClient();

  const { data: shop } = await supabase
    .from("barbershops")
    .select("mp_access_token")
    .eq("slug", slug)
    .maybeSingle();
  const accessToken = (shop as { mp_access_token?: string | null } | null)
    ?.mp_access_token;
  if (!accessToken) {
    return NextResponse.json({ ok: true, skipped: "no token" });
  }

  // Fuente de verdad: el estado real del pago en MP.
  const result = await getPayment(accessToken, paymentId);
  if (!result.ok) {
    // No pudimos validar: 200 igual (MP reintentará por su cuenta).
    return NextResponse.json({ ok: true, skipped: "payment fetch failed" });
  }
  const payment = result.payment;
  const appointmentId = payment.external_reference;
  if (!appointmentId) {
    return NextResponse.json({ ok: true, skipped: "no external_reference" });
  }

  // Auditoría: siempre registramos que llegó la notificación.
  await supabase.from("payment_events").insert({
    appointment_id: appointmentId,
    event_type: "webhook_received",
    amount: payment.transaction_amount,
    mp_payment_id: String(payment.id),
    raw_payload: payment as unknown as Record<string, unknown>,
  });

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status, deposit_status, mp_payment_id")
    .eq("id", appointmentId)
    .maybeSingle();
  const apptRow = appt as {
    id: string;
    status: string;
    deposit_status: string | null;
    mp_payment_id: string | null;
  } | null;

  if (!apptRow) {
    return NextResponse.json({ ok: true, skipped: "appointment not found" });
  }

  // Idempotencia: ya procesado.
  if (apptRow.deposit_status === "paid" || apptRow.mp_payment_id) {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  if (payment.status === "approved") {
    // Pago tardío sobre un turno ya cancelado/expirado: NO reconfirmar.
    if (apptRow.status === "cancelled" || apptRow.deposit_status === "expired") {
      await supabase.from("payment_events").insert({
        appointment_id: appointmentId,
        event_type: "payment_approved",
        amount: payment.transaction_amount,
        mp_payment_id: String(payment.id),
        raw_payload: { note: "pago aprobado sobre turno ya expirado/cancelado — revisar manual" },
      });
      return NextResponse.json({ ok: true, lateApproval: true });
    }

    await supabase
      .from("appointments")
      .update({
        status: "confirmed",
        deposit_status: "paid",
        deposit_paid_at: new Date().toISOString(),
        mp_payment_id: String(payment.id),
      })
      .eq("id", appointmentId);
    await supabase.from("payment_events").insert({
      appointment_id: appointmentId,
      event_type: "payment_approved",
      amount: payment.transaction_amount,
      mp_payment_id: String(payment.id),
    });
    return NextResponse.json({ ok: true, confirmed: true });
  }

  if (payment.status === "rejected") {
    await supabase.from("payment_events").insert({
      appointment_id: appointmentId,
      event_type: "payment_rejected",
      amount: payment.transaction_amount,
      mp_payment_id: String(payment.id),
    });
    return NextResponse.json({ ok: true, rejected: true });
  }

  // pending / in_process u otros → registrado en webhook_received, sin cambios.
  return NextResponse.json({ ok: true, status: payment.status });
}

export async function POST(request: Request) {
  try {
    return await handle(request);
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "mp/webhook" } });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

// MP a veces hace un GET de verificación al configurar el webhook.
export async function GET() {
  return NextResponse.json({ ok: true });
}
