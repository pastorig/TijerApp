import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendClientPushForAppointment } from "@/lib/push/sendClientPush";
import { formatDateWithWeekday, normalizeTimeValue } from "@/lib/format";

/**
 * El push que le avisa AL CLIENTE que le confirmaron o le cancelaron el turno.
 *
 * Lo mandan el panel del dueño (por `/api/appointments/notify-client`) y la
 * agenda del empleado. Vivía suelto adentro de esa ruta y el empleado no lo
 * mandaba: cancelaba y el cliente no se enteraba por ningún lado (feature 026).
 *
 * Best-effort por diseño: si falla, el turno ya cambió de estado igual. Nunca
 * tira — devuelve cuántos push salieron, y cero es una respuesta válida.
 *
 * **No valida permisos.** Eso lo hace la ruta antes de llamar.
 */
export async function enviarPushDeEstadoAlCliente({
  appointmentId,
  barbershopSlug,
  status,
}: {
  appointmentId: string;
  barbershopSlug: string;
  status: "confirmed" | "cancelled";
}): Promise<{ sent: number }> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data: appointment } = await supabase
      .from("appointments")
      .select(
        "id, appointment_date, appointment_time, barber_name, confirmation_token",
      )
      .eq("id", appointmentId)
      // El turno tiene que ser de ESTA barbería: sin esto se podrían disparar
      // notificaciones de turnos de otra.
      .eq("barbershop_slug", barbershopSlug)
      .maybeSingle();

    if (!appointment) return { sent: 0 };

    const cuando = `${formatDateWithWeekday(appointment.appointment_date)} a las ${normalizeTimeValue(
      appointment.appointment_time,
    ).slice(0, 5)}`;
    const conBarbero = appointment.barber_name
      ? ` con ${appointment.barber_name}`
      : "";

    const payload =
      status === "confirmed"
        ? {
            title: "Tu turno está confirmado",
            body: `Te esperamos el ${cuando}${conBarbero}.`,
          }
        : {
            title: "Se canceló tu turno",
            body: `El del ${cuando} no va. Escribinos y lo reprogramamos.`,
          };

    const result = await sendClientPushForAppointment(appointmentId, {
      ...payload,
      url: appointment.confirmation_token
        ? `/r/${appointment.confirmation_token}`
        : "/",
    });
    return { sent: result.sent };
  } catch {
    // Silencio deliberado: es un aviso, no la operación.
    return { sent: 0 };
  }
}
