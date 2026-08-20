import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getPayment } from "@/lib/mercadopago/client";
import { verifyWebhookSignature } from "@/lib/mercadopago/webhook-signature";

export const runtime = "nodejs";

/**
 * POST /api/mp/webhook?bs=<slug>
 *
 * Recibe las notificaciones de pago de MercadoPago. El `?bs=` nos dice de qué
 * barbería es (para usar su access_token). NO confiamos en el payload: re-
 * consultamos el pago real contra MP. Es idempotente: notificaciones repetidas
 * no confirman el turno ni registran el pago más de una vez.
 *
 * Además se valida la firma (`x-signature`) cuando hay al menos uno de los
 * dos secretos cargados: `MP_WEBHOOK_SECRET` (pagos reales) y
 * `MP_WEBHOOK_SECRET_TEST` (usuarios de prueba de MP). MP firma cada
 * notificación con el secreto del modo que la generó, así que con uno solo
 * cargado el otro modo se rechazaría con 401.
 *
 * **Mientras no exista ninguno de los dos, la validación no hace nada**:
 * prenderla a medias cortaría el cobro de seña de cualquier barbería que ya
 * esté cobrando. Al cargarla hay que rehacer la prueba de punta a punta: un
 * secreto equivocado rechaza notificaciones buenas, y eso se ve como "el
 * cliente pagó y el turno no se confirmó".
 *
 * Responde 200 salvo error interno real (MP reintenta ante respuestas no-2xx).
 */

type WebhookBody = {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string | number };
};

/**
 * ── Por qué la URL del panel de MP lleva `?bs=primebarber` ──────────────────
 *
 * Los pagos reales NO dependen de esa URL: cada preferencia se crea con su
 * propio `notification_url` y el slug de su barbería (ver appointments/book).
 * La del panel es la de nivel aplicación, y sirve para eventos sueltos y para
 * el simulador.
 *
 * El slug de la demo está puesto a propósito y **no hay que sacarlo**: sin
 * `bs`, el handler corta más abajo en "missing bs or paymentId" ANTES de
 * validar la firma, así que el simulador devolvería 200 aunque el secreto
 * estuviera mal. Sería un 200 que no prueba nada — justo lo contrario de para
 * qué existe esa prueba.
 *
 * Si algún día llega ahí una notificación real de otra barbería: se busca el
 * token de la demo, la consulta del pago falla y se responde 200 sin tocar
 * nada. Y si llegara a resolver, el chequeo de `external_reference` de más
 * abajo la rechaza. La notificación buena llega igual por la URL de su propia
 * preferencia.
 *
 * Resolver la barbería sin el slug NO es simple: haría falta leer el
 * `external_reference` del pago, que está adentro del pago, que no se puede
 * consultar sin el token de la barbería. Es circular. La salida sería
 * escuchar también `merchant_order` (que trae el `preference_id`, y el
 * `mp_preference_id` ya se guarda en el turno), pero es un camino de
 * notificación nuevo entero y hoy no arregla ningún problema real.
 */
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

  // La firma se chequea antes de cualquier consulta: es la diferencia entre
  // ignorar a un tercero y salir a preguntarle a MP por datos que nos mandó él.
  const signature = verifyWebhookSignature({
    signatureHeader: request.headers.get("x-signature"),
    requestIdHeader: request.headers.get("x-request-id"),
    dataId: paymentId,
    secrets: {
      produccion: process.env.MP_WEBHOOK_SECRET,
      prueba: process.env.MP_WEBHOOK_SECRET_TEST,
    },
  });
  if (!signature.ok) {
    Sentry.captureMessage("Webhook de MP con firma inválida", {
      level: "warning",
      tags: { route: "mp/webhook", motivo: signature.reason },
      extra: { slug, paymentId },
    });
    // 401 y no 200: que MP lo reintente y que quede registrado. Si esto
    // aparece para TODAS las notificaciones, el secreto cargado no es el que
    // corresponde a la aplicación.
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  // Con qué secreto cerró la firma. Se devuelve para poder verlo desde el
  // simulador de MP y, sobre todo, en la prueba con usuarios de prueba: si una
  // notificación REAL validara con el secreto de prueba, algo está cruzado y
  // conviene enterarse ahí y no cuando un cliente reclame el turno.
  const modoFirma = signature.reason === "firma-valida" ? signature.modo : null;

  const supabase = getSupabaseAdminClient();

  const { data: shop } = await supabase
    .from("barbershops")
    .select("mp_access_token")
    .eq("slug", slug)
    .maybeSingle();
  const accessToken = (shop as { mp_access_token?: string | null } | null)
    ?.mp_access_token;
  if (!accessToken) {
    return NextResponse.json({ ok: true, skipped: "no token", modoFirma });
  }

  // Fuente de verdad: el estado real del pago en MP.
  const result = await getPayment(accessToken, paymentId);
  if (!result.ok) {
    // No pudimos validar: 200 igual (MP reintentará por su cuenta).
    return NextResponse.json({
      ok: true,
      skipped: "payment fetch failed",
      modoFirma,
    });
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

  // El turno tiene que pertenecer a la barbería del ?bs=. Sin este filtro el
  // external_reference del pago mandaba solo: una barbería podía generar en su
  // propia cuenta de MP un pago apuntando al turno de OTRA y marcárselo pagado.
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status, deposit_status, mp_payment_id")
    .eq("id", appointmentId)
    .eq("barbershop_slug", slug)
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

    // La guarda deposit_status='pending' va DENTRO del update, no solo en el
    // if de arriba: MP reintenta y las entregas pueden solaparse. Con el
    // chequeo suelto, dos requests del mismo pago pasaban el if antes de que
    // cualquiera escribiera y el cobro quedaba registrado dos veces.
    const { data: updatedRows } = await supabase
      .from("appointments")
      .update({
        status: "confirmed",
        deposit_status: "paid",
        deposit_paid_at: new Date().toISOString(),
        mp_payment_id: String(payment.id),
      })
      .eq("id", appointmentId)
      .eq("deposit_status", "pending")
      .select("id");

    // 0 filas = otra entrega concurrente ganó la carrera. No es error.
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }
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
