import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPublicBookingEnabled } from "@/lib/api-plan-guard";

export const runtime = "nodejs";

/**
 * POST /api/waitlist/confirm
 *
 * El cliente desde /w/[token] confirma un turno. Creamos un appointment
 * con los datos del waitlist + fecha/hora elegidas, y marcamos la
 * entrada como fulfilled.
 *
 * Si el slot ya fue tomado por otro (race condition), el unique partial
 * index appointments_unique_active_slot devuelve 23505 y avisamos.
 */
export async function POST(request: Request) {
  let payload: {
    token?: unknown;
    date?: unknown;
    time?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const token = typeof payload.token === "string" ? payload.token : "";
  const date = typeof payload.date === "string" ? payload.date : "";
  const time = typeof payload.time === "string" ? payload.time : "";

  if (!token || !date || !time) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    return NextResponse.json({ error: "Hora inválida." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: entry, error: entryError } = await supabase
    .from("waitlist_entries")
    .select(
      "id, barbershop_slug, barber_id, service_name, service_duration_minutes, customer_name, customer_phone, customer_email, notes, status",
    )
    .eq("confirmation_token", token)
    .is("deleted_at", null)
    .maybeSingle();

  if (entryError || !entry) {
    return NextResponse.json(
      { error: "Entrada no encontrada." },
      { status: 404 },
    );
  }
  if (entry.status === "fulfilled" || entry.status === "cancelled") {
    return NextResponse.json(
      { error: "Esta entrada ya fue resuelta." },
      { status: 409 },
    );
  }

  // Plan vencido => modo lectura. Cubre el caso de una oferta de lista de
  // espera que quedó viva desde antes del vencimiento.
  const bookingGate = await assertPublicBookingEnabled(entry.barbershop_slug);
  if (!bookingGate.ok) {
    return NextResponse.json(
      { error: bookingGate.error },
      { status: bookingGate.status },
    );
  }

  // Traemos nombre del barbero + precio del servicio si existe.
  const [{ data: barber }, { data: services }] = await Promise.all([
    supabase
      .from("barbers")
      .select("name, display_name")
      .eq("id", entry.barber_id)
      .maybeSingle(),
    supabase
      .from("barber_services")
      .select("name, price")
      .eq("barber_id", entry.barber_id)
      .eq("name", entry.service_name)
      .eq("is_active", true)
      .is("deleted_at", null)
      .limit(1),
  ]);

  const barberName = barber?.display_name?.trim() || barber?.name || "Barbero";
  const servicePrice =
    Array.isArray(services) && services.length > 0
      ? (services[0]?.price ?? 0)
      : 0;

  const timeNormalized = time.length === 5 ? `${time}:00` : time;

  // Creamos el appointment.
  const { data: appointment, error: insertError } = await supabase
    .from("appointments")
    .insert({
      barbershop_slug: entry.barbershop_slug,
      barber_id: entry.barber_id,
      barber_name: barberName,
      customer_name: entry.customer_name,
      customer_phone: entry.customer_phone,
      customer_email: entry.customer_email,
      service_name: entry.service_name,
      service_price: servicePrice,
      service_duration_minutes: entry.service_duration_minutes,
      appointment_date: date,
      appointment_time: timeNormalized,
      comment: entry.notes ?? "",
      status: "pending",
    })
    .select("id, confirmation_token")
    .single();

  if (insertError) {
    Sentry.captureException(insertError);
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Ese horario ya fue tomado por otra reserva. Elegí otro slot.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "No pudimos crear el turno." },
      { status: 500 },
    );
  }

  // Marcamos waitlist como fulfilled.
  await supabase
    .from("waitlist_entries")
    .update({
      status: "fulfilled",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", entry.id);

  return NextResponse.json({
    ok: true,
    appointmentId: appointment?.id,
    appointmentToken: appointment?.confirmation_token,
  });
}
