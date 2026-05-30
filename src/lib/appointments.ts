import {
  getSupabaseClient,
  type AppointmentInsert,
} from "@/lib/supabase";
import { getBarberDayAvailability } from "@/lib/barber-availability";

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
};

type AppointmentTimeInput = AppointmentAvailabilityInput & {
  appointmentTime: string;
};

export async function createPendingAppointment(appointment: AppointmentDraft) {
  // .select().single() para que el INSERT devuelva la fila creada,
  // incluyendo el confirmation_token auto-generado por DB.
  return getSupabaseClient()
    .from("appointments")
    .insert({ ...appointment, status: "pending" })
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
      "id, barbershop_slug, barber_id, barber_name, customer_name, customer_phone, service_name, service_price, service_duration_minutes, actual_duration_minutes, appointment_date, appointment_time, comment, status, created_at, confirmation_token, internal_notes",
    )
    .single();
}

export async function listAppointmentsByBarbershop(barbershopSlug: string) {
  const { data, error } = await getSupabaseClient()
    .from("appointments")
    .select(
      "id, barbershop_slug, barber_id, barber_name, customer_name, customer_phone, service_name, service_price, service_duration_minutes, actual_duration_minutes, appointment_date, appointment_time, comment, status, created_at, confirmation_token, internal_notes",
    )
    .eq("barbershop_slug", barbershopSlug)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  return { data, error };
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
}: AppointmentTimeInput) {
  const { data, error } = await getBarberDayAvailability({
    barbershopSlug,
    barberId,
    appointmentDate,
    appointmentDurationMinutes,
    workingHours,
    barbershopIntervalMinutes,
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
