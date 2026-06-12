import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { buildAvailabilitySlots } from "@/lib/availability";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * GET /api/appointments/available-slots?token=<token>&date=<YYYY-MM-DD>
 *
 * Devuelve los slots disponibles del mismo barbero/servicio para una
 * fecha dada. Usado por el flow de reagendar en /r/[token]/responder.
 *
 * Solo expone slots con isAvailable=true (no devuelve los ocupados/pasados).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const date = url.searchParams.get("date");

  if (!token || !date) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  // Buscamos el turno por token + el barbershop para los workingHours base.
  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .select(
      "id, barbershop_slug, barber_id, service_duration_minutes, status",
    )
    .eq("confirmation_token", token)
    .maybeSingle();

  if (apptError || !appointment) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }
  if (
    appointment.status === "deleted" ||
    appointment.status === "cancelled"
  ) {
    return NextResponse.json(
      { error: "El turno está cancelado." },
      { status: 409 },
    );
  }

  const [bshopResult, schedulesResult, blocksResult, appointmentsResult] =
    await Promise.all([
      supabase
        .from("barbershops")
        .select("working_hours_start, working_hours_end, slot_interval_minutes")
        .eq("slug", appointment.barbershop_slug)
        .maybeSingle(),
      supabase
        .from("barber_weekly_schedules")
        .select("day_of_week, start_time, end_time, is_working")
        .eq("barbershop_slug", appointment.barbershop_slug)
        .eq("barber_id", appointment.barber_id),
      supabase
        .from("barber_time_blocks")
        .select("start_time, end_time, block_date")
        .eq("barbershop_slug", appointment.barbershop_slug)
        .eq("barber_id", appointment.barber_id)
        .eq("block_date", date)
        .eq("is_active", true)
        .is("deleted_at", null),
      supabase
        .from("appointments")
        .select("appointment_time, service_duration_minutes, status")
        .eq("barbershop_slug", appointment.barbershop_slug)
        .eq("barber_id", appointment.barber_id)
        .eq("appointment_date", date)
        .in("status", ["pending", "confirmed"])
        .neq("id", appointment.id), // excluimos el propio turno
    ]);

  if (bshopResult.error) {
    Sentry.captureException(bshopResult.error);
    return NextResponse.json(
      { error: "Error cargando barbería." },
      { status: 500 },
    );
  }

  const workingHours = {
    start: bshopResult.data?.working_hours_start ?? "09:00",
    end: bshopResult.data?.working_hours_end ?? "21:00",
    intervalMinutes: bshopResult.data?.slot_interval_minutes ?? 30,
  };

  // Mapeamos al shape que espera buildAvailabilitySlots.
  type WeeklyScheduleRow = {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_working: boolean;
  };
  type TimeBlockRow = {
    start_time: string;
    end_time: string;
    block_date: string;
  };
  type DayApptRow = {
    appointment_time: string;
    service_duration_minutes: number;
  };

  const slots = buildAvailabilitySlots({
    appointmentDate: date,
    appointmentDurationMinutes:
      appointment.service_duration_minutes ?? workingHours.intervalMinutes,
    barbershopIntervalMinutes: workingHours.intervalMinutes,
    workingHours: { start: workingHours.start, end: workingHours.end },
    weeklySchedules: ((schedulesResult.data ?? []) as WeeklyScheduleRow[]).map(
      (r) => ({
        id: "",
        created_at: "",
        barbershop_slug: appointment.barbershop_slug,
        barber_id: appointment.barber_id,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        is_working: r.is_working,
        // Pausa al medio opcional — defaults a null si el SELECT no la trajo
        // (compatibilidad con queries que no incluyen break_start/end).
        break_start: (r as { break_start?: string | null }).break_start ?? null,
        break_end: (r as { break_end?: string | null }).break_end ?? null,
      }),
    ),
    timeBlocks: ((blocksResult.data ?? []) as TimeBlockRow[]).map((r) => ({
      id: "",
      created_at: "",
      barbershop_slug: appointment.barbershop_slug,
      barber_id: appointment.barber_id,
      block_date: r.block_date,
      start_time: r.start_time,
      end_time: r.end_time,
      reason: null,
      is_active: true,
      deleted_at: null,
    })),
    appointments: ((appointmentsResult.data ?? []) as DayApptRow[]).map(
      (r) => ({
        startTime: r.appointment_time,
        durationMinutes: r.service_duration_minutes,
      }),
    ),
  });

  // Devolvemos solo los disponibles (sin pasados).
  const available = slots
    .filter((s) => s.isAvailable)
    .map((s) => s.time);

  return NextResponse.json({ ok: true, date, available });
}
