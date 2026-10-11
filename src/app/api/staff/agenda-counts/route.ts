import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { contarPorDia } from "@/lib/staff-agenda-counts";
import {
  ocupacionDelMesDesdeFilas,
  type ExcepcionDelMes,
} from "@/components/admin/agenda-schedule-helpers";
import type { BarberWeeklyScheduleRow } from "@/lib/supabase";
import {
  barberIdForAppointments,
  resolveStaffAccess,
} from "@/lib/server/staff-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Un mes de calendario más los bordes; más que eso no lo pide ninguna vista. */
const MAX_DIAS = 70;

/**
 * GET /api/staff/agenda-counts?bs=<slug>&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Cuántos turnos tiene el empleado cada día del rango y qué tan ocupado está.
 * Es lo que pinta los puntitos del calendario: la cantidad decide si hay
 * punto, la ocupación decide el color.
 *
 * Mismas reglas que `/api/staff/agenda`, y por los mismos motivos: el barbero
 * sale del token y **nunca** del request, y sólo se devuelve el número — ni un
 * nombre de cliente ni un horario, que para un punto no hacen falta. La hora y
 * la duración se leen para sacar la cuenta, pero no salen del servidor.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("bs") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  const access = await resolveStaffAccess(
    request.headers.get("authorization"),
    slug,
  );
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const formatoOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!formatoOk(from) || !formatoOk(to) || from > to) {
    return NextResponse.json({ error: "Rango inválido." }, { status: 400 });
  }

  // Un rango abierto sería un "traeme todos los turnos de la historia" que
  // cualquiera puede pedir con un token válido. El tope lo corta.
  const dias =
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000 +
    1;
  if (dias > MAX_DIAS) {
    return NextResponse.json(
      { error: "Rango demasiado largo." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const barberId = barberIdForAppointments(access.access);
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "barber_id, appointment_date, appointment_time, status, service_duration_minutes, actual_duration_minutes",
    )
    .eq("barbershop_slug", slug)
    .eq("barber_id", barberId)
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .neq("status", "deleted");

  if (error) {
    Sentry.captureException(error, { tags: { route: "staff/agenda-counts" } });
    return NextResponse.json(
      { error: "No pudimos traer tu calendario." },
      { status: 500 },
    );
  }

  // Su horario real de esos días, para medir la ocupación: semanal, excepciones
  // y bloqueos. Son las mismas tablas que usa la disponibilidad. Si alguna
  // falla no se manda la ocupación y los puntos caen a los cortes por cantidad:
  // un adorno no puede dejar al barbero sin calendario.
  const [shopRes, semanalRes, excepcionesRes, bloqueosRes] = await Promise.all([
    supabase
      .from("barbershops")
      .select("working_hours_start, working_hours_end, slot_interval_minutes")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("barber_weekly_schedules")
      .select("day_of_week, start_time, end_time, is_working, break_start, break_end")
      .eq("barbershop_slug", slug)
      .eq("barber_id", barberId),
    supabase
      .from("barber_day_overrides")
      .select(
        "barber_id, override_date, start_time, end_time, is_working, hereda_pausa, break_start, break_end",
      )
      .eq("barbershop_slug", slug)
      .eq("barber_id", barberId)
      .gte("override_date", from)
      .lte("override_date", to)
      .is("deleted_at", null),
    supabase
      .from("barber_time_blocks")
      .select("barber_id, block_date, start_time, end_time")
      .eq("barbershop_slug", slug)
      .eq("barber_id", barberId)
      .gte("block_date", from)
      .lte("block_date", to)
      .eq("is_active", true)
      .is("deleted_at", null),
  ]);

  const horarioOk =
    !shopRes.error && !semanalRes.error && !excepcionesRes.error && !bloqueosRes.error;
  if (!horarioOk) {
    Sentry.captureMessage("staff/agenda-counts: no se pudo leer el horario del mes", {
      tags: { route: "staff/agenda-counts" },
    });
  }

  return NextResponse.json({
    ok: true,
    conteos: contarPorDia(data ?? []),
    ocupacion: horarioOk
      ? ocupacionDelMesDesdeFilas({
          barberIds: [barberId],
          weeklySchedulesByBarber: {
            [barberId]: (semanalRes.data ?? []) as unknown as BarberWeeklyScheduleRow[],
          },
          excepciones: (excepcionesRes.data ?? []) as ExcepcionDelMes[],
          bloqueos: bloqueosRes.data ?? [],
          turnos: data ?? [],
          workingHours: {
            start: shopRes.data?.working_hours_start ?? "09:00",
            end: shopRes.data?.working_hours_end ?? "21:00",
            intervalMinutes: shopRes.data?.slot_interval_minutes ?? 30,
          },
        })
      : undefined,
  });
}
