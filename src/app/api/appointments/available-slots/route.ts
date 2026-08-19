import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getServerAvailability } from "@/lib/server/slot-availability";

export const runtime = "nodejs";

/**
 * GET /api/appointments/available-slots?token=<token>&date=<YYYY-MM-DD>
 *
 * Slots disponibles del mismo barbero/servicio para una fecha. Lo usa el flujo
 * de reagendar en /r/[token]/responder.
 *
 * El cálculo vive en `getServerAvailability` porque lo comparte con el propio
 * reagendado y con la reserva pública: si la lista que se muestra y la que se
 * valida al guardar salieran de dos lugares distintos, tarde o temprano se
 * contradicen.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const date = url.searchParams.get("date");

  if (!token || !date) {
    return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .select("id, barbershop_slug, barber_id, service_duration_minutes, status")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (apptError || !appointment) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }
  if (appointment.status === "deleted" || appointment.status === "cancelled") {
    return NextResponse.json(
      { error: "El turno está cancelado." },
      { status: 409 },
    );
  }

  const { available } = await getServerAvailability({
    barbershopSlug: appointment.barbershop_slug,
    barberId: appointment.barber_id,
    date,
    durationMinutes: appointment.service_duration_minutes ?? 0,
    excludeAppointmentId: appointment.id,
  });

  return NextResponse.json({ ok: true, date, available });
}
