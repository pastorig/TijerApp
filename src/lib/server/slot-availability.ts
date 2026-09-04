import "server-only";

import {
  buildAvailabilitySlots,
  type AvailabilitySlot,
} from "@/lib/availability";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { motivoDeHorario } from "@/lib/slot-reason";
import { ahoraEnArgentina } from "@/lib/hora-argentina";
import type {
  BarberDayOverrideRow,
  BarberTimeBlockRow,
  BarberWeeklyScheduleRow,
} from "@/lib/supabase";

/**
 * Disponibilidad calculada EN EL SERVIDOR, con el service role.
 *
 * Existe porque la validación de "¿este horario se puede reservar?" vivía solo
 * en el browser: /api/appointments/reschedule aceptaba cualquier fecha y hora
 * (03:17 de un domingo, o el año 2099) y la reserva pública insertaba directo
 * contra la tabla. El motor de disponibilidad —horario semanal, pausa al medio,
 * excepción del día, bloqueos, anticipación mínima— quedaba salteado.
 *
 * Es la misma función pura que usa el front (buildAvailabilitySlots), así que
 * cliente y servidor no pueden discrepar.
 */

export type ServerAvailabilityParams = {
  barbershopSlug: string;
  barberId: string;
  /** YYYY-MM-DD */
  date: string;
  durationMinutes: number;
  /** Turno a excluir (al reagendar, el propio turno no se pisa a sí mismo). */
  excludeAppointmentId?: string;
};

/** Tope de reserva hacia adelante. Sin esto se aceptaba el año 2099. */
export const MAX_BOOKING_DAYS_AHEAD = 180;

export async function getServerAvailability(
  params: ServerAvailabilityParams,
): Promise<{ available: string[]; slots: AvailabilitySlot[] }> {
  const { barbershopSlug, barberId, date, durationMinutes, excludeAppointmentId } =
    params;
  const supabase = getSupabaseAdminClient();

  const [shopRes, schedulesRes, overrideRes, blocksRes, apptsRes] =
    await Promise.all([
      supabase
        .from("barbershops")
        .select(
          "working_hours_start, working_hours_end, slot_interval_minutes, min_booking_notice_minutes",
        )
        .eq("slug", barbershopSlug)
        .maybeSingle(),
      // break_start/break_end SÍ se piden: sin ellos la pausa al medio se
      // ignoraba y se ofrecían turnos en el horario de almuerzo del barbero.
      supabase
        .from("barber_weekly_schedules")
        .select(
          "day_of_week, start_time, end_time, is_working, break_start, break_end",
        )
        .eq("barbershop_slug", barbershopSlug)
        .eq("barber_id", barberId),
      supabase
        .from("barber_day_overrides")
        .select("override_date, start_time, end_time, is_working")
        .eq("barbershop_slug", barbershopSlug)
        .eq("barber_id", barberId)
        .eq("override_date", date)
        .maybeSingle(),
      supabase
        .from("barber_time_blocks")
        .select("start_time, end_time, block_date")
        .eq("barbershop_slug", barbershopSlug)
        .eq("barber_id", barberId)
        .eq("block_date", date)
        .eq("is_active", true)
        .is("deleted_at", null),
      supabase
        .from("appointments")
        .select("id, appointment_time, service_duration_minutes")
        .eq("barbershop_slug", barbershopSlug)
        .eq("barber_id", barberId)
        .eq("appointment_date", date)
        .in("status", ["pending", "confirmed"]),
    ]);

  const workingHours = {
    start: shopRes.data?.working_hours_start ?? "09:00",
    end: shopRes.data?.working_hours_end ?? "21:00",
    intervalMinutes: shopRes.data?.slot_interval_minutes ?? 30,
  };

  const slots = buildAvailabilitySlots({
    appointmentDate: date,
    appointmentDurationMinutes: durationMinutes || workingHours.intervalMinutes,
    barbershopIntervalMinutes: workingHours.intervalMinutes,
    workingHours: { start: workingHours.start, end: workingHours.end },
    weeklySchedules: (schedulesRes.data ?? []).map((r) => ({
      id: "",
      created_at: "",
      barbershop_slug: barbershopSlug,
      barber_id: barberId,
      day_of_week: r.day_of_week,
      start_time: r.start_time,
      end_time: r.end_time,
      is_working: r.is_working,
      break_start: r.break_start ?? null,
      break_end: r.break_end ?? null,
    })) as unknown as BarberWeeklyScheduleRow[],
    dayOverride: (overrideRes.data ?? null) as unknown as BarberDayOverrideRow | null,
    timeBlocks: (blocksRes.data ?? []).map((r) => ({
      id: "",
      created_at: "",
      barbershop_slug: barbershopSlug,
      barber_id: barberId,
      block_date: r.block_date,
      start_time: r.start_time,
      end_time: r.end_time,
      reason: null,
      is_active: true,
      deleted_at: null,
    })) as unknown as BarberTimeBlockRow[],
    appointments: (apptsRes.data ?? [])
      .filter((r) => !excludeAppointmentId || r.id !== excludeAppointmentId)
      .map((r) => ({
        startTime: r.appointment_time,
        durationMinutes: r.service_duration_minutes,
      })),
    minBookingNoticeMinutes: shopRes.data?.min_booking_notice_minutes ?? 0,
    // Sin esto el servidor mide con el reloj de Vercel, que corre en UTC: tres
    // horas adelante del de la barbería. Rechazaba por "falta muy poco" turnos
    // que la pantalla del cliente mostraba libres.
    now: ahoraEnArgentina(),
  });

  return {
    available: slots.filter((s) => s.isAvailable).map((s) => s.time),
    slots,
  };
}

export type SlotCheck =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Valida que un horario concreto se pueda reservar de verdad.
 * Normaliza a HH:MM porque la grilla trabaja así y la DB guarda HH:MM:SS.
 */
export async function assertSlotBookable(
  params: ServerAvailabilityParams & { time: string },
): Promise<SlotCheck> {
  const { date, time } = params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, status: 400, error: "Fecha inválida." };
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    return { ok: false, status: 400, error: "Hora inválida." };
  }

  const dateMs = new Date(`${date}T12:00:00`).getTime();
  if (!Number.isFinite(dateMs)) {
    return { ok: false, status: 400, error: "Fecha inválida." };
  }
  const daysAhead = Math.floor((dateMs - Date.now()) / 86400000);
  if (daysAhead > MAX_BOOKING_DAYS_AHEAD) {
    return {
      ok: false,
      status: 400,
      error: `Solo se puede reservar hasta ${MAX_BOOKING_DAYS_AHEAD} días adelante.`,
    };
  }

  const { available, slots } = await getServerAvailability(params);
  const buscado = time.slice(0, 5);

  if (!available.includes(buscado)) {
    // Si el horario ni figura en la grilla del barbero es que para él no
    // existe: pasa cuando dos barberos arrancan a horas distintas y sus
    // grillas no coinciden. `motivoDeHorario` cubre ese caso.
    const slot = slots.find((s) => s.time === buscado);
    return {
      ok: false,
      status: 409,
      error: motivoDeHorario(slot?.reason),
    };
  }
  return { ok: true };
}
