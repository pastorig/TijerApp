import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanActive } from "@/lib/api-plan-guard";
import {
  barberIdForAppointments,
  resolveStaffAccess,
} from "@/lib/server/staff-access";
import { enviarAvisoDeReprogramacion } from "@/lib/server/reschedule-email";

export const runtime = "nodejs";

/**
 * PATCH /api/staff/appointment-reschedule
 * Body: { barbershopSlug, appointmentId, newDate, newTime }
 *
 * El empleado mueve un turno suyo de día o de hora.
 *
 * ── Lo que hace distinta a ésta de las otras acciones del empleado ──────────
 * Las demás afectan su agenda. Ésta **afecta al cliente**: alguien que reservó
 * a las 15 y aparece a las 15 porque nadie le avisó que ahora es a las 17.
 * Mover un turno en silencio es peor que no moverlo.
 *
 * Por eso el aviso **no es opcional ni depende del empleado**: el mail lo manda
 * el servidor, acá mismo, apenas el turno se movió. En particular, lo manda
 * aunque el empleado no tenga permiso de ver el teléfono del cliente — ese
 * permiso decide si él puede escribirle, no si al cliente se le avisa.
 *
 * Cuando el cliente no tiene mail, la respuesta lo dice para que la pantalla se
 * lo avise al barbero: ahí el aviso queda en sus manos.
 *
 * ── El barbero NO cambia ────────────────────────────────────────────────────
 * A propósito, y es la diferencia con el drag & drop del dueño. Pasarle un
 * turno a un compañero es decidir sobre la agenda de otro; el empleado mueve
 * dentro de la suya.
 */

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const slug = texto(body.barbershopSlug);
  const appointmentId = texto(body.appointmentId);
  const newDate = texto(body.newDate);
  const newTime = texto(body.newTime);

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

  if (!access.access.permisos.reprogramar) {
    return NextResponse.json(
      { error: "El dueño de la barbería no habilitó que muevas turnos." },
      { status: 403 },
    );
  }

  if (!appointmentId) {
    return NextResponse.json({ error: "Falta el turno." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(newTime)) {
    return NextResponse.json({ error: "Horario inválido." }, { status: 400 });
  }

  const plan = await assertPlanActive(slug);
  if (!plan.ok) {
    return NextResponse.json({ error: plan.error }, { status: plan.status });
  }

  const supabase = getSupabaseAdminClient();
  const barberId = barberIdForAppointments(access.access);

  // De dónde sale el turno: hace falta para el mail, que muestra el horario
  // viejo tachado. Se lee ANTES del update, que es cuando todavía existe.
  const { data: antes } = await supabase
    .from("appointments")
    .select("appointment_date, appointment_time, customer_name, customer_phone, status")
    .eq("id", appointmentId)
    .eq("barbershop_slug", slug)
    .eq("barber_id", barberId)
    .maybeSingle();

  if (!antes || antes.status === "cancelled" || antes.status === "deleted") {
    // No existe, es de otro barbero, o está cancelado. Al empleado se le
    // responde lo mismo en los tres casos.
    return NextResponse.json(
      { error: "Ese turno no está en tu agenda." },
      { status: 404 },
    );
  }

  const mismoLugar =
    antes.appointment_date === newDate &&
    antes.appointment_time.slice(0, 5) === newTime;
  if (mismoLugar) {
    return NextResponse.json(
      { error: "Ese turno ya está en ese día y horario." },
      { status: 400 },
    );
  }

  // La guarda de que el turno es suyo va DENTRO del update, igual que en
  // confirmar y cancelar: preguntar antes y escribir después deja una ventana.
  const { data, error } = await supabase
    .from("appointments")
    .update({
      appointment_date: newDate,
      appointment_time: `${newTime}:00`,
      status_changed_by: access.access.userId,
      status_changed_by_name: access.access.barberName,
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("barbershop_slug", slug)
    .eq("barber_id", barberId)
    .neq("status", "cancelled")
    .neq("status", "deleted")
    .select("id")
    .maybeSingle();

  if (error) {
    // 23505 = índice único → ya hay un turno suyo en ese horario. La guarda
    // vive en la base y no en un chequeo previo, que dejaría una ventana.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya tenés otro turno en ese horario." },
        { status: 409 },
      );
    }
    Sentry.captureException(error, {
      tags: { route: "staff/appointment-reschedule" },
    });
    return NextResponse.json(
      { error: "No pudimos mover el turno." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Ese turno no está en tu agenda." },
      { status: 404 },
    );
  }

  // El aviso, con el mismo mail que manda el panel del dueño. Nunca tira: si
  // no se puede mandar, devuelve el motivo y la pantalla se lo dice al barbero.
  const aviso = await enviarAvisoDeReprogramacion({
    appointmentId,
    barbershopSlug: slug,
    oldDate: antes.appointment_date,
    oldTime: antes.appointment_time.slice(0, 5),
  });

  return NextResponse.json({
    ok: true,
    aviso,
    // Para que la pantalla pueda ofrecerle el WhatsApp cuando el mail no salió.
    // Solo si tiene el permiso: si no, el teléfono no sale de acá.
    cliente: {
      nombre: antes.customer_name,
      telefono: access.access.permisos.contactarCliente
        ? (antes.customer_phone ?? null)
        : null,
    },
    anterior: {
      fecha: antes.appointment_date,
      hora: antes.appointment_time.slice(0, 5),
    },
  });
}
