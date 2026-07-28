import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPublicBookingEnabled } from "@/lib/api-plan-guard";
import { computeDepositAmount } from "@/lib/mercadopago/deposit";
import { createDepositPreference } from "@/lib/mercadopago/client";
import { refreshAccessToken, expiresAtFrom } from "@/lib/mercadopago/oauth";

export const runtime = "nodejs";

/**
 * POST /api/appointments/book
 *
 * Crea una reserva CON SEÑA (solo barberías con mp_enabled=true). Hace todo
 * server-side porque necesita el access_token de MercadoPago de la barbería,
 * que es secreto y nunca debe llegar al cliente.
 *
 * Flujo:
 *  1. Valida que la barbería tenga seña activa y token cargado.
 *  2. Resuelve precio/duración del servicio DESDE LA DB (no confía en el cliente).
 *  3. Calcula el monto de la seña (porcentaje o mínimo).
 *  4. Inserta el turno como `pending` (retiene el horario por el índice único).
 *  5. Crea la preference de MP y persiste mp_preference_id + datos de seña.
 *  6. Devuelve el init_point para que el cliente pague.
 *
 * Si la preference falla, cancela el turno (libera el slot) y devuelve error.
 */

type BookBody = {
  barbershopSlug?: string;
  barberId?: string;
  barberName?: string;
  serviceId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  appointmentDate?: string;
  appointmentTime?: string;
  comment?: string;
};

/**
 * Base URL pública para el webhook y los back_urls. Usamos el origin del
 * request (el host real donde está deployado: preview o prod) para que MP
 * pueda notificar a ESTE deploy. Fallback a NEXT_PUBLIC_SITE_URL.
 */
function siteUrl(request: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  try {
    const origin = new URL(request.url).origin;
    // En localhost MP no puede llegar; preferimos el env si está seteado.
    if (origin.includes("localhost") && fromEnv) return fromEnv;
    return origin;
  } catch {
    return fromEnv || "http://localhost:3000";
  }
}

export async function POST(request: Request) {
  let body: BookBody;
  try {
    body = (await request.json()) as BookBody;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const slug = typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  const barberId = typeof body.barberId === "string" ? body.barberId : "";
  const serviceId = typeof body.serviceId === "string" ? body.serviceId : "";
  const customerName =
    typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerPhone =
    typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const customerEmail =
    typeof body.customerEmail === "string" && body.customerEmail.trim()
      ? body.customerEmail.trim()
      : null;
  const appointmentDate =
    typeof body.appointmentDate === "string" ? body.appointmentDate : "";
  const appointmentTime =
    typeof body.appointmentTime === "string" ? body.appointmentTime : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (
    !slug ||
    !barberId ||
    !serviceId ||
    !customerName ||
    !customerPhone ||
    !appointmentDate ||
    !appointmentTime
  ) {
    return NextResponse.json(
      { error: "Faltan datos para crear la reserva." },
      { status: 400 },
    );
  }

  // Plan vencido => la barbería queda en modo lectura y la reserva online se
  // apaga. El cliente final va por WhatsApp.
  const bookingGate = await assertPublicBookingEnabled(slug);
  if (!bookingGate.ok) {
    return NextResponse.json(
      { error: bookingGate.error },
      { status: bookingGate.status },
    );
  }

  const supabase = getSupabaseAdminClient();

  // 1. Barbería + config de seña.
  const { data: shop, error: shopError } = await supabase
    .from("barbershops")
    .select(
      "slug, name, mp_enabled, mp_access_token, mp_refresh_token, mp_token_expires_at, deposit_percent, deposit_min_amount, deposit_auto_cancel_hours, require_client_email",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (shopError) {
    Sentry.captureException(shopError, { tags: { route: "appointments/book" } });
    return NextResponse.json(
      { error: "No pudimos validar la barbería." },
      { status: 500 },
    );
  }

  const shopRow = shop as {
    slug: string;
    name: string;
    mp_enabled: boolean;
    mp_access_token: string | null;
    mp_refresh_token: string | null;
    mp_token_expires_at: string | null;
    deposit_percent: number;
    deposit_min_amount: number | null;
    deposit_auto_cancel_hours: number;
    require_client_email: boolean;
  } | null;

  // Modo simulación (solo testing): permite reservar con seña SIN token real
  // de MP, para comprobar el flujo. Gateado por env var.
  const simMode =
    process.env.NEXT_PUBLIC_ALLOW_DEPOSIT_SIMULATION === "true";

  if (!shopRow || !shopRow.mp_enabled) {
    return NextResponse.json(
      { error: "Esta barbería no tiene el cobro de seña activo." },
      { status: 400 },
    );
  }

  // Email obligatorio si la barbería lo configuró (defensa server-side; el
  // form ya lo valida antes de enviar).
  if (shopRow.require_client_email && !customerEmail) {
    return NextResponse.json(
      { error: "Esta barbería necesita tu email para reservar." },
      { status: 400 },
    );
  }
  if (!shopRow.mp_access_token && !simMode) {
    return NextResponse.json(
      { error: "Esta barbería no tiene el cobro de seña activo." },
      { status: 400 },
    );
  }

  // 2. Servicio desde la DB (precio/duración confiables).
  const { data: service, error: serviceError } = await supabase
    .from("barber_services")
    .select("id, name, price, duration_minutes, barber_id")
    .eq("id", serviceId)
    .eq("barbershop_slug", slug)
    .eq("barber_id", barberId)
    .is("deleted_at", null)
    .maybeSingle();

  const serviceRow = service as {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
    barber_id: string;
  } | null;

  if (serviceError || !serviceRow) {
    return NextResponse.json(
      { error: "El servicio no es válido para este barbero." },
      { status: 400 },
    );
  }

  // 3. Monto de la seña.
  const depositAmount = computeDepositAmount({
    servicePrice: serviceRow.price,
    depositPercent: shopRow.deposit_percent,
    depositMinAmount: shopRow.deposit_min_amount,
  });

  if (depositAmount <= 0) {
    return NextResponse.json(
      { error: "No se pudo calcular la seña." },
      { status: 400 },
    );
  }

  const expiresAt = new Date(
    Date.now() + shopRow.deposit_auto_cancel_hours * 60 * 60 * 1000,
  ).toISOString();

  const barberName =
    typeof body.barberName === "string" && body.barberName.trim()
      ? body.barberName.trim()
      : "Barbero";

  // 4. Insert del turno (pending → retiene el slot).
  const { data: inserted, error: insertError } = await supabase
    .from("appointments")
    .insert({
      barbershop_slug: slug,
      barber_id: barberId,
      barber_name: barberName,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      service_name: serviceRow.name,
      service_price: serviceRow.price,
      service_duration_minutes: serviceRow.duration_minutes,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      comment,
      status: "pending",
      deposit_required: true,
      deposit_amount: depositAmount,
      deposit_status: "pending",
      deposit_expires_at: expiresAt,
    })
    .select("id, confirmation_token")
    .single();

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return NextResponse.json(
        { error: "Ese horario acaba de ocuparse. Elegí otro." },
        { status: 409 },
      );
    }
    Sentry.captureException(insertError, {
      tags: { route: "appointments/book", step: "insert" },
    });
    return NextResponse.json(
      { error: "No pudimos guardar la reserva." },
      { status: 500 },
    );
  }

  const appointmentId = (inserted as { id: string }).id;
  const token = (inserted as { confirmation_token: string }).confirmation_token;

  // 5. Modo simulación: NO creamos preference (no hay MP). El turno queda
  // pending con seña, y se confirma desde el botón "Simular pago".
  if (simMode && !shopRow.mp_access_token) {
    await supabase.from("payment_events").insert({
      appointment_id: appointmentId,
      event_type: "preference_created",
      amount: depositAmount,
      raw_payload: { simulated: true },
    });
    return NextResponse.json({
      ok: true,
      appointmentId,
      token,
      initPoint: null,
      depositAmount,
      simulate: true,
    });
  }

  // 5b. Token fresco: si el access_token está por vencer (< 7 días) y hay
  // refresh_token (cuenta conectada por OAuth), lo renovamos y persistimos.
  let accessToken = shopRow.mp_access_token!;
  const expMs = shopRow.mp_token_expires_at
    ? new Date(shopRow.mp_token_expires_at).getTime()
    : null;
  const needsRefresh =
    expMs !== null && expMs - Date.now() < 7 * 24 * 60 * 60 * 1000;
  if (needsRefresh && shopRow.mp_refresh_token) {
    const refreshed = await refreshAccessToken(shopRow.mp_refresh_token);
    if (refreshed.ok) {
      accessToken = refreshed.token.access_token;
      await supabase
        .from("barbershops")
        .update({
          mp_access_token: refreshed.token.access_token,
          mp_refresh_token: refreshed.token.refresh_token,
          mp_token_expires_at: expiresAtFrom(refreshed.token.expires_in),
        })
        .eq("slug", slug);
    }
  }

  // 5c. Preference de MercadoPago.
  const base = siteUrl(request);
  const pref = await createDepositPreference(accessToken, {
    title: `Seña - ${serviceRow.name} en ${shopRow.name}`,
    amount: depositAmount,
    appointmentId,
    notificationUrl: `${base}/api/mp/webhook?bs=${encodeURIComponent(slug)}`,
    backUrl: `${base}/r/${token}`,
    expiresAt,
    payerEmail: customerEmail,
  });

  if (!pref.ok) {
    // No se pudo generar el pago: cancelamos el turno para liberar el slot y
    // no dejar una reserva fantasma que bloquee el horario.
    await supabase
      .from("appointments")
      .update({ status: "cancelled", deposit_status: "failed" })
      .eq("id", appointmentId);
    await supabase.from("payment_events").insert({
      appointment_id: appointmentId,
      event_type: "payment_rejected",
      amount: depositAmount,
      raw_payload: { stage: "preference_create", error: pref.error },
    });
    return NextResponse.json(
      { error: "No pudimos generar el pago de la seña. Probá de nuevo." },
      { status: 502 },
    );
  }

  // 6. Persistir preference + auditoría.
  await supabase
    .from("appointments")
    .update({ mp_preference_id: pref.preferenceId })
    .eq("id", appointmentId);
  await supabase.from("payment_events").insert({
    appointment_id: appointmentId,
    event_type: "preference_created",
    amount: depositAmount,
    mp_preference_id: pref.preferenceId,
  });

  return NextResponse.json({
    ok: true,
    appointmentId,
    token,
    initPoint: pref.initPoint,
    depositAmount,
  });
}
