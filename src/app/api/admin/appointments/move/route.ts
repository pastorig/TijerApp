import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/appointments/move
 *
 * Mueve un turno (drag & drop desde el panel admin):
 *  - Cambia appointment_time (siempre)
 *  - Opcionalmente cambia appointment_date (drop a otro día — futuro)
 *  - Opcionalmente cambia barber_id (drop a columna de otro barbero)
 *
 * Body:
 *   {
 *     appointmentId: string,
 *     barbershopSlug: string,
 *     newTime: string (HH:MM o HH:MM:SS),
 *     newDate?: string (YYYY-MM-DD; default: misma fecha que el appointment),
 *     newBarberId?: string (UUID; default: mismo barbero que el appointment)
 *   }
 *
 * Headers:
 *   Authorization: Bearer <supabase access token del admin>
 *
 * Validaciones:
 *  - Auth como admin de la barbería
 *  - Si newBarberId presente: validar que el barbero pertenece a la
 *    misma barbería (FK + check explícito)
 *  - Validar que el slot nuevo no choca (constraint unique partial index
 *    appointments_unique_active_slot devuelve 23505 si choca)
 *  - El turno debe estar activo (no cancelled/deleted)
 *  - El barber_name se actualiza si cambia barber_id (denormalizado en la
 *    tabla appointments para mostrar sin JOIN)
 *
 * Returns:
 *   200 { ok: true, appointment: { id, appointment_time, appointment_date, barber_id, barber_name } }
 *   400 — body inválido o validación
 *   401 — sin auth
 *   403 — admin de otra barbería
 *   404 — appointment no encontrado
 *   409 — slot ocupado o appointment cancelled
 *   500 — error inesperado
 */

async function assertAdminOfBarbershop(
  authHeader: string | null,
  barbershopSlug: string,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }
> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  const accessToken = authHeader.slice("Bearer ".length);
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }

  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();

  if (adminError) {
    return { ok: false, status: 500, error: "Error validando permisos." };
  }
  if (!adminRow) {
    return { ok: false, status: 403, error: "No sos admin de esta barbería." };
  }
  return { ok: true, userId: userResult.user.id };
}

export async function PATCH(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const appointmentId =
    typeof payload.appointmentId === "string" ? payload.appointmentId : "";
  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  const newTimeRaw =
    typeof payload.newTime === "string" ? payload.newTime : "";
  const newDateRaw =
    typeof payload.newDate === "string" ? payload.newDate : "";
  const newBarberId =
    typeof payload.newBarberId === "string" ? payload.newBarberId : "";

  if (!appointmentId || !barbershopSlug || !newTimeRaw) {
    return NextResponse.json(
      { error: "Faltan parámetros: appointmentId, barbershopSlug, newTime." },
      { status: 400 },
    );
  }

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(newTimeRaw)) {
    return NextResponse.json(
      { error: "Hora inválida (HH:MM)." },
      { status: 400 },
    );
  }
  if (newDateRaw && !/^\d{4}-\d{2}-\d{2}$/.test(newDateRaw)) {
    return NextResponse.json(
      { error: "Fecha inválida (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  const auth = await assertAdminOfBarbershop(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  // 1. Cargar el appointment actual + verificar que pertenece a la barbería
  const { data: appointment, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select(
      "id, barbershop_slug, barber_id, barber_name, status, appointment_date, appointment_time",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (fetchError) {
    Sentry.captureException(fetchError);
    return NextResponse.json(
      { error: "No pudimos leer el turno." },
      { status: 500 },
    );
  }
  if (!appointment) {
    return NextResponse.json(
      { error: "Turno no encontrado." },
      { status: 404 },
    );
  }
  if (appointment.barbershop_slug !== barbershopSlug) {
    return NextResponse.json(
      { error: "El turno no pertenece a esta barbería." },
      { status: 403 },
    );
  }
  if (
    appointment.status === "deleted" ||
    appointment.status === "cancelled"
  ) {
    return NextResponse.json(
      { error: "No se pueden mover turnos cancelados." },
      { status: 409 },
    );
  }

  // 2. Si cambia barber_id: validar que el nuevo barbero pertenece a la
  //    misma barbería y traer su nombre (para denormalizar barber_name)
  const targetBarberId = newBarberId || appointment.barber_id;
  let targetBarberName = appointment.barber_name;

  if (newBarberId && newBarberId !== appointment.barber_id) {
    const { data: targetBarber, error: barberError } = await supabaseAdmin
      .from("barbers")
      .select("id, name, display_name, barbershop_slug")
      .eq("id", newBarberId)
      .maybeSingle();

    if (barberError) {
      Sentry.captureException(barberError);
      return NextResponse.json(
        { error: "Error validando el barbero destino." },
        { status: 500 },
      );
    }
    if (!targetBarber) {
      return NextResponse.json(
        { error: "Barbero destino no encontrado." },
        { status: 404 },
      );
    }
    if (targetBarber.barbershop_slug !== barbershopSlug) {
      return NextResponse.json(
        { error: "El barbero no pertenece a esta barbería." },
        { status: 403 },
      );
    }
    targetBarberName =
      targetBarber.display_name?.trim() || targetBarber.name;
  }

  // 3. Normalizar time a HH:MM:SS
  const newTimeNormalized =
    newTimeRaw.length === 5 ? `${newTimeRaw}:00` : newTimeRaw;
  const targetDate = newDateRaw || appointment.appointment_date;

  // 4. Si no hay cambio real, no-op
  if (
    appointment.appointment_date === targetDate &&
    appointment.appointment_time === newTimeNormalized &&
    appointment.barber_id === targetBarberId
  ) {
    return NextResponse.json({
      ok: true,
      appointment: {
        id: appointment.id,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        barber_id: appointment.barber_id,
        barber_name: appointment.barber_name,
      },
      changed: false,
    });
  }

  // 5. Update. El unique partial index appointments_unique_active_slot
  //    protege contra choques entre turnos activos (mismo barbero +
  //    fecha + hora). Si choca, devuelve 23505.
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("appointments")
    .update({
      appointment_date: targetDate,
      appointment_time: newTimeNormalized,
      barber_id: targetBarberId,
      barber_name: targetBarberName,
    })
    .eq("id", appointmentId)
    .select(
      "id, appointment_date, appointment_time, barber_id, barber_name",
    )
    .single();

  if (updateError) {
    Sentry.captureException(updateError);
    if (updateError.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Ese slot ya tiene un turno activo. Probá otro horario o barbero.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "No pudimos mover el turno." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    appointment: updated,
    changed: true,
  });
}
