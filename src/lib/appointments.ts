import {
  getSupabaseClient,
  type AppointmentInsert,
  type AppointmentRow,
} from "@/lib/supabase";
import { getBarberDayAvailability } from "@/lib/barber-availability";

/**
 * Las columnas que el panel necesita de un turno.
 *
 * ⚠️ Ojo con lo que NO está acá: una columna que falte no rompe nada visible,
 * llega como `undefined` y la pantalla que la use se comporta como si el dato
 * no existiera. Pasó con `cancellation_reason` (feature 021): el turnero tenía
 * escrito el bloque "Motivo" y la pantalla de Clientes detectaba ghosts a
 * partir de él, pero como no se pedía, el motivo nunca llegaba — el bloque no
 * se dibujaba nunca y NINGÚN cliente se marcaba como ghost, ni siquiera los
 * que el dueño había marcado a mano al cancelar.
 */
const APPOINTMENT_SELECT =
  "id, barbershop_slug, barber_id, barber_name, customer_name, customer_phone, customer_email, service_name, service_price, service_duration_minutes, actual_duration_minutes, appointment_date, appointment_time, comment, status, created_at, confirmation_token, internal_notes, deposit_status, deposit_amount, cancellation_reason, status_changed_by_name, status_changed_at";

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

/**
 * Le avisa al cliente que el barbero le confirmó o le canceló el turno.
 *
 * Best-effort a propósito: se llama DESPUÉS de que el cambio de estado ya se
 * guardó, y si falla no se le muestra nada al barbero — el turno ya cambió y
 * una notificación que no salió no es un error que él pueda resolver. Por eso
 * no devuelve nada y el turnero la dispara sin esperarla.
 *
 * El sentido inverso (el cliente responde el link y le llega al barbero) no
 * pasa por acá: vive en las RPC del token, dentro de la base.
 */
export async function notifyClientOfStatusChange(params: {
  barbershopSlug: string;
  appointmentId: string;
  status: "confirmed" | "cancelled";
}): Promise<{ email?: { sent: boolean; skipped?: string } | null } | null> {
  try {
    const { data } = await getSupabaseClient().auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return null;

    const res = await fetch("/api/appointments/notify-client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(params),
    });
    // Devuelve qué pasó con el mail de cancelación (feature 026) para que el
    // panel avise si el cliente quedó sin enterarse. Sigue sin tirar nunca: el
    // turno ya cambió de estado y esto es un aviso, no la operación.
    return (await res.json().catch(() => null)) as {
      email?: { sent: boolean; skipped?: string } | null;
    } | null;
  } catch {
    // Silencio deliberado.
    return null;
  }
}
