import {
  getSupabaseClient,
  type AppointmentInsert,
  type AppointmentRow,
} from "@/lib/supabase";
import { getBarberDayAvailability } from "@/lib/barber-availability";

const APPOINTMENT_SELECT =
  "id, barbershop_slug, barber_id, barber_name, customer_name, customer_phone, customer_email, service_name, service_price, service_duration_minutes, actual_duration_minutes, appointment_date, appointment_time, comment, status, created_at, confirmation_token, internal_notes, deposit_status, deposit_amount";

/** Tope de filas por request de PostgREST/Supabase (default del proyecto). */
const PAGE_SIZE = 1000;

type AppointmentDraft = Omit<AppointmentInsert, "status">;
type AppointmentAvailabilityInput = {
  barbershopSlug: string;
  barberId: string;
  appointmentDate: string;
  appointmentDurationMinutes: number;
  workingHours: {
    start: string;
    end: string;
  };
  barbershopIntervalMinutes: number;
  /** Anticipación mínima (min) para reservar. 0 = sin restricción. */
  minBookingNoticeMinutes?: number;
};

type AppointmentTimeInput = AppointmentAvailabilityInput & {
  appointmentTime: string;
};

export async function createPendingAppointment(
  appointment: AppointmentDraft,
  options?: { autoConfirm?: boolean },
) {
  // Cuando la barbería tiene auto-confirm activado, la reserva entra
  // directamente como confirmed para saltear el paso manual. Default a
  // pending para preservar el flujo original.
  const status = options?.autoConfirm ? "confirmed" : "pending";
  // .select().single() para que el INSERT devuelva la fila creada,
  // incluyendo el confirmation_token auto-generado por DB.
  return getSupabaseClient()
    .from("appointments")
    .insert({ ...appointment, status })
    .select("id, confirmation_token")
    .single();
}

export async function confirmAppointment(appointmentId: string) {
  return getSupabaseClient()
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", appointmentId);
}

export async function cancelAppointment(
  appointmentId: string,
  cancellationReason?: string | null,
) {
  // Normalizamos: trim + null si quedó vacío. Así no guardamos strings
  // como "   " que después contaminan analytics.
  const trimmed = cancellationReason?.trim() || null;
  return getSupabaseClient()
    .from("appointments")
    .update({
      status: "cancelled",
      cancellation_reason: trimmed,
    })
    .eq("id", appointmentId);
}

export async function deleteAppointment(appointmentId: string) {
  return getSupabaseClient()
    .from("appointments")
    .update({ status: "deleted" })
    .eq("id", appointmentId);
}

export async function restoreDeletedAppointment(appointmentId: string) {
  return getSupabaseClient()
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);
}

export async function updateAppointmentActualDuration(
  appointmentId: string,
  actualDurationMinutes: number | null,
) {
  return getSupabaseClient()
    .from("appointments")
    .update({ actual_duration_minutes: actualDurationMinutes })
    .eq("id", appointmentId)
    .select(
      "id, barbershop_slug, barber_id, barber_name, customer_name, customer_phone, customer_email, service_name, service_price, service_duration_minutes, actual_duration_minutes, appointment_date, appointment_time, comment, status, created_at, confirmation_token, internal_notes, deposit_status, deposit_amount",
    )
    .single();
}

/**
 * Trae TODOS los turnos de una barbería, paginando para saltar el tope de
 * ~1000 filas por request de Supabase/PostgREST. Sin esto, una barbería con
 * más de 1000 turnos recibía la lista truncada SIN error, y el recuento de
 * visitas por cliente (que se calcula sobre esta lista) daba números
 * incompletos/equivocados. La paginación garantiza el conteo correcto a
 * cualquier escala.
 */
export async function listAppointmentsByBarbershop(barbershopSlug: string) {
  const client = getSupabaseClient();
  const all: AppointmentRow[] = [];
  let from = 0;

  // Loop acotado por seguridad (máx 100 páginas = 100k turnos) para que un
  // bug jamás derive en un loop infinito.
  for (let page = 0; page < 100; page++) {
    const { data, error } = await client
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("barbershop_slug", barbershopSlug)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return { data: null, error };
    }
    const rows = (data ?? []) as unknown as AppointmentRow[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break; // última página
    from += PAGE_SIZE;
  }

  return { data: all, error: null };
}

export async function listOccupiedAppointmentTimes({
  barbershopSlug,
  barberId,
  appointmentDate,
  appointmentDurationMinutes,
  workingHours,
  barbershopIntervalMinutes,
}: AppointmentAvailabilityInput) {
  const { data, error } = await getBarberDayAvailability({
    barbershopSlug,
    barberId,
    appointmentDate,
    appointmentDurationMinutes,
    barbershopIntervalMinutes,
    workingHours,
  });

  return {
    data: data.filter((slot) => !slot.isAvailable).map((slot) => slot.time),
    error,
  };
}

export async function validateAppointmentTimeIsAvailable({
  barbershopSlug,
  barberId,
  appointmentDate,
  appointmentTime,
  appointmentDurationMinutes,
  workingHours,
  barbershopIntervalMinutes,
  minBookingNoticeMinutes = 0,
}: AppointmentTimeInput) {
  const { data, error } = await getBarberDayAvailability({
    barbershopSlug,
    barberId,
    appointmentDate,
    appointmentDurationMinutes,
    workingHours,
    barbershopIntervalMinutes,
    minBookingNoticeMinutes,
  });

  if (error) {
    return { isAvailable: false, error };
  }

  const selectedSlot = data.find((slot) => slot.time === appointmentTime);

  return {
    isAvailable: Boolean(selectedSlot?.isAvailable),
    error: null,
  };
}
