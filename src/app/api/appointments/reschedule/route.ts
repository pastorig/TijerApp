import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * POST /api/appointments/reschedule
 *
 * Mueve un turno a una nueva fecha/hora, validado por el token público.
 * El cliente lo invoca desde /r/[token]/responder al elegir "Reagendar".
 *
 * Validaciones:
 * - Token válido + turno NO cancelled/deleted.
 * - Nueva fecha futura (no se puede reagendar para el pasado).
 * - El slot nuevo no choca con otro turno activo del mismo barbero
 *   (lo protege también el unique partial index appointments_unique_active_slot).
 *
 * El turno conserva el mismo confirmation_token y vuelve a status='pending'
 * para que el barbero deba confirmar de nuevo.
 */

export async function POST(request: Request) {
  let payload: {
    token?: unknown;
    newDate?: unknown;
    newTime?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const token = typeof payload.token === "string" ? payload.token : "";
  const newDate = typeof payload.newDate === "string" ? payload.newDate : "";
  const newTime = typeof payload.newTime === "string" ? payload.newTime : "";

  if (!token || !newDate || !newTime) {
    return NextResponse.json(
      { error: "Faltan parámetros: token, newDate, newTime." },
      { status: 400 },
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    return NextResponse.json(
      { error: "Fecha inválida (YYYY-MM-DD)." },
      { status: 400 },
    );
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(newTime)) {
    return NextResponse.json(
      { error: "Hora inválida (HH:MM)." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  // Buscamos el turno por token. El RPC público devuelve datos seguros;
  // acá necesitamos el row entero, así que vamos directo a la tabla con
  // admin client (bypassa RLS).
  const { data: appointment, error: fetchError } = await supabase
    .from("appointments")
    .select(
      "id, barbershop_slug, barber_id, status, appointment_date, appointment_time, service_duration_minutes",
    )
    .eq("confirmation_token", token)
    .maybeSingle();

  if (fetchError) {
    Sentry.captureException(fetchError);
    return NextResponse.json(
      { error: "No pudimos leer el turno." },
      { status: 500 },
    );
  }
  if (!appointment || !appointment.id) {
    return NextResponse.json(
      { error: "Turno no encontrado." },
      { status: 404 },
    );
  }
  if (
    appointment.status === "deleted" ||
    appointment.status === "cancelled"
  ) {
    return NextResponse.json(
      { error: "El turno fue cancelado, no se puede reagendar." },
      { status: 409 },
    );
  }

  // ── Ventana mínima de 1 hora (anti-colgada del barbero) ──────────────────
  // No permitir reagendar un turno que arranca en menos de 1 hora. Misma
  // lógica que la cancelación: si el cliente mueve el turno 5 min antes, el
  // barbero queda colgado sin tiempo de reacomodar. El barbero (admin) sí
  // puede mover cualquier turno desde su panel.
  //
  // Timezone: los turnos se guardan en hora local Argentina. Computamos
  // "ahora en AR" y el inicio del turno actual en el mismo frame para que
  // la diferencia sea correcta sin importar la tz del server (Vercel = UTC).
  {
    const nowArMs = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
      }),
    ).getTime();
    const currentTime =
      appointment.appointment_time.length === 5
        ? `${appointment.appointment_time}:00`
        : appointment.appointment_time;
    const apptStartMs = new Date(
      `${appointment.appointment_date}T${currentTime}`,
    ).getTime();
    const minutesUntil = (apptStartMs - nowArMs) / 60000;

    if (Number.isFinite(minutesUntil) && minutesUntil < 60) {
      return NextResponse.json(
        {
          error:
            "Ya no se puede reagendar online: falta menos de 1 hora para tu turno. Escribile directo a la barbería por WhatsApp.",
        },
        { status: 409 },
      );
    }
  }

  // No permitir reagendar al pasado.
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (newDate < todayYmd) {
    return NextResponse.json(
      { error: "No podés reagendar a una fecha pasada." },
      { status: 400 },
    );
  }

  // Normalizamos el time a HH:MM:SS.
  const newTimeNormalized = newTime.length === 5 ? `${newTime}:00` : newTime;

  // Si la fecha+hora son las mismas, no hay nada que cambiar.
  if (
    appointment.appointment_date === newDate &&
    appointment.appointment_time === newTimeNormalized
  ) {
    return NextResponse.json(
      { error: "Elegí un horario distinto al actual." },
      { status: 400 },
    );
  }

  // Update. El unique partial index appointments_unique_active_slot
  // protege contra choques entre turnos activos. Si choca, viene 23505.
  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      appointment_date: newDate,
      appointment_time: newTimeNormalized,
      status: "pending",
    })
    .eq("id", appointment.id);

  if (updateError) {
    Sentry.captureException(updateError);
    if (updateError.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Ese horario ya está reservado por otro turno. Elegí otro slot.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "No pudimos reagendar el turno." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    appointmentId: appointment.id,
    newDate,
    newTime: newTimeNormalized,
  });
}
