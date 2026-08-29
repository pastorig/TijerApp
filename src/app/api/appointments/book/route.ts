import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPublicBookingEnabled } from "@/lib/api-plan-guard";
import { computeDepositAmount } from "@/lib/mercadopago/deposit";
import { assertSlotBookable } from "@/lib/server/slot-availability";
import {
  checkRateLimit,
  getRequestIdentifier,
  getValueIdentifier,
} from "@/lib/rate-limit";
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
  /**
   * Solo el CÓDIGO. El id del cupón y el monto del descuento los resuelve el
   * server contra la RPC validate_coupon_for_booking: si vinieran del cliente,
   * cualquiera se autoasigna el descuento que quiera.
   */
  couponCode?: string | null;
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

  // Rate limit: sin esto un script llena la agenda de una barbería con turnos
  // basura, y no hay nada que lo frene porque reservar no pide cuenta.
  //
  // Dos frenos que se complementan. El de IP va POR BARBERÍA: la IP sola es
  // mal identificador acá porque los celulares argentinos salen por CGNAT y
  // clientes distintos comparten IP pública. El de teléfono es el que
  // realmente distingue a una persona de un script.
  // Los dos frenos van EN PARALELO. Antes el del teléfono esperaba al de IP
  // para ahorrarse una consulta en el caso bloqueado, que es el raro; el
  // precio lo pagaba el caso normal, que es todos los demás.
  //
  // ⚠️ El identificador se normaliza con `\D` (no dígitos). Estaba escrito
  // `/D/`, que borra la letra "D" y deja el teléfono tal cual vino: el mismo
  // número escrito "3571624511", "3571 62-4511" y "+54 9 3571 62-4511" caía en
  // tres cubetas distintas. O sea que el freno por teléfono —que es el que de
  // verdad distingue a una persona de un script, porque la IP no sirve con el
  // CGNAT argentino— se esquivaba cambiando el formato.
  const [ipLimit, phoneLimit] = await Promise.all([
    checkRateLimit("reserva", getRequestIdentifier(request, slug)),
    checkRateLimit(
      "reserva-telefono",
      getValueIdentifier(customerPhone.replace(/\D/g, "")),
    ),
  ]);
  const limit = ipLimit.allowed ? phoneLimit : ipLimit;
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en un rato." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
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
      "slug, name, mp_enabled, mp_access_token, mp_refresh_token, mp_token_expires_at, deposit_percent, deposit_min_amount, deposit_auto_cancel_hours, require_client_email, auto_confirm_appointments",
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
    auto_confirm_appointments: boolean | null;
  } | null;

  // Modo simulación (solo testing): permite reservar con seña SIN token real
  // de MP, para comprobar el flujo. Gateado por env var.
  const simMode =
    process.env.NEXT_PUBLIC_ALLOW_DEPOSIT_SIMULATION === "true";

  if (!shopRow) {
    return NextResponse.json(
      { error: "Barbería no encontrada." },
      { status: 404 },
    );
  }

  // Con seña o sin seña, TODA reserva pública pasa por acá. Antes, cuando la
  // barbería no tenía MercadoPago, el formulario insertaba directo contra la
  // tabla con la anon key: el precio, el descuento y el horario llegaban del
  // browser sin que nadie los revisara.
  const wantsDeposit = Boolean(shopRow.mp_enabled);

  // Email obligatorio si la barbería lo configuró (defensa server-side; el
  // form ya lo valida antes de enviar).
  if (shopRow.require_client_email && !customerEmail) {
    return NextResponse.json(
      { error: "Esta barbería necesita tu email para reservar." },
      { status: 400 },
    );
  }
  if (wantsDeposit && !shopRow.mp_access_token && !simMode) {
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

  // 2b. El horario tiene que existir de verdad en la grilla del barbero:
  // horario semanal, pausa al medio, excepción del día, bloqueos, anticipación
  // mínima y tope de 180 días. Es la misma función que arma la lista que ve el
  // cliente, así que no pueden discrepar.
  const slotCheck = await assertSlotBookable({
    barbershopSlug: slug,
    barberId,
    date: appointmentDate,
    time: appointmentTime,
    durationMinutes: serviceRow.duration_minutes,
  });
  if (!slotCheck.ok) {
    return NextResponse.json(
      { error: slotCheck.error },
      { status: slotCheck.status },
    );
  }

  // 2c. Cupón: se valida y se calcula acá, nunca se acepta el monto del
  // cliente. La RPC chequea vigencia, activo y tope de usos.
  let couponId: string | null = null;
  let discountAmount: number | null = null;
  const couponCode =
    typeof body.couponCode === "string" && body.couponCode.trim()
      ? body.couponCode.trim().toUpperCase()
      : null;

  if (couponCode) {
    const { data: couponRows } = await supabase.rpc(
      "validate_coupon_for_booking",
      {
        p_barbershop_slug: slug,
        p_code: couponCode,
        p_service_price: serviceRow.price,
      },
    );
    const row = (couponRows as Array<{
      is_valid: boolean;
      coupon_id: string | null;
      discount_amount: number | null;
    }> | null)?.[0];

    if (!row || !row.is_valid) {
      return NextResponse.json(
        { error: "El cupón no es válido." },
        { status: 400 },
      );
    }
    couponId = row.coupon_id;
    discountAmount = row.discount_amount;
  }

  const barberName =
    typeof body.barberName === "string" && body.barberName.trim()
      ? body.barberName.trim()
      : "Barbero";

  // ── Camino SIN seña: la mayoría de las barberías ────────────────────────
  // Inserta y termina. El status sale de la config de la barbería, no del
  // cliente. Todos los campos con valor (precio, duración, descuento) ya
  // fueron resueltos server-side arriba.
  if (!wantsDeposit) {
    const { data: simple, error: simpleError } = await supabase
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
        status: shopRow.auto_confirm_appointments ? "confirmed" : "pending",
        coupon_id: couponId,
        discount_amount: discountAmount,
      })
      .select("id, confirmation_token")
      .single();

    if (simpleError || !simple) {
      if (simpleError?.code === "23505") {
        return NextResponse.json(
          { error: "Ese horario acaba de ocuparse. Elegí otro." },
          { status: 409 },
        );
      }
      Sentry.captureException(simpleError, {
        tags: { route: "appointments/book", step: "insert-simple" },
      });
      return NextResponse.json(
        { error: "No pudimos guardar la reserva." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      appointmentId: (simple as { id: string }).id,
      token: (simple as { confirmation_token: string }).confirmation_token,
      initPoint: null,
      depositAmount: null,
    });
  }

  // 3. Monto de la seña (solo el camino con MercadoPago).
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
      coupon_id: couponId,
      discount_amount: discountAmount,
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
