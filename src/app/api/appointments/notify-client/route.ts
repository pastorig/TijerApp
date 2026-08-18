import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendClientPushForAppointment } from "@/lib/push/sendClientPush";
import { formatDateWithWeekday, normalizeTimeValue } from "@/lib/format";

export const runtime = "nodejs";

/**
 * POST /api/appointments/notify-client
 *   body { barbershopSlug, appointmentId, status: "confirmed" | "cancelled" }
 *   → { sent }
 *
 * Le avisa AL CLIENTE que el barbero le confirmó o le canceló el turno.
 *
 * Por qué existe como endpoint aparte y no como trigger en la base: los push a
 * clientes no pasan por `push_notification_queue` (esa cola es de admins). Se
 * mandan directo con web-push desde Node leyendo `client_push_subscriptions`,
 * así que necesitan correr en el server — y el turnero cambia el estado desde
 * el browser.
 *
 * El sentido inverso (el cliente responde el link y le llega al barbero) sí
 * vive en la base, dentro de las RPC del token.
 *
 * Es best-effort por diseño: si esto falla, el turno ya cambió de estado igual.
 * El turnero lo llama sin esperar el resultado.
 */

async function assertAdmin(authHeader: string | null, barbershopSlug: string) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, error: "No autorizado." };
  }
  const supabase = getSupabaseAdminClient();
  const { data: userResult } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (!userResult.user) {
    return { ok: false as const, status: 401, error: "Sesión inválida." };
  }
  const { data: adminRow } = await supabase
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();
  if (!adminRow) {
    return {
      ok: false as const,
      status: 403,
      error: "No sos admin de esta barbería.",
    };
  }
  return { ok: true as const };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  const appointmentId =
    typeof body.appointmentId === "string" ? body.appointmentId : "";
  const status = body.status === "cancelled" ? "cancelled" : "confirmed";

  if (!barbershopSlug || !appointmentId) {
    return NextResponse.json(
      { error: "Faltan barbershopSlug o appointmentId." },
      { status: 400 },
    );
  }

  const auth = await assertAdmin(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select(
        "id, barbershop_slug, appointment_date, appointment_time, barber_name, confirmation_token",
      )
      .eq("id", appointmentId)
      // El turno tiene que ser de ESTA barbería: sin esto, un admin podría
      // disparar notificaciones de turnos de otra.
      .eq("barbershop_slug", barbershopSlug)
      .maybeSingle();

    if (error || !appointment) {
      return NextResponse.json(
        { error: "No encontramos el turno." },
        { status: 404 },
      );
    }

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

    return NextResponse.json({ sent: result.sent });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "appointments/notify-client", method: "POST" },
    });
    return NextResponse.json(
      { error: "No pudimos notificar al cliente." },
      { status: 500 },
    );
  }
}
