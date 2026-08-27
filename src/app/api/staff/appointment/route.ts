import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanActive } from "@/lib/api-plan-guard";
import { resolveStaffAccess } from "@/lib/server/staff-access";

export const runtime = "nodejs";

/**
 * POST /api/staff/appointment
 * Body: { barbershopSlug, serviceId, customerName, customerPhone?, date, time, comment? }
 *
 * El empleado carga el turno del que entró sin reservar.
 *
 * ── Por qué existe este endpoint y no reusa el del dueño ────────────────────
 * El dueño escribe el turno **directo contra Supabase** desde el navegador. El
 * empleado no está en `barbershop_admins`, así que RLS lo frena — a propósito.
 * Todo lo suyo pasa por el servidor, y acá eso además habilita algo que el
 * modal del dueño no puede hacer: **forzar que el turno sea para él**.
 *
 * ── Qué NO llega del cliente ────────────────────────────────────────────────
 * El `barber_id`. Sale del token. Si viniera en el body, un empleado podría
 * cargarle turnos a un compañero cambiando un id.
 *
 * El precio y la duración tampoco: salen del servicio que se busca en la base.
 * Si viajaran, el empleado podría inflar el precio de un corte y con eso su
 * propia comisión.
 *
 * ── El turno nace pendiente ─────────────────────────────────────────────────
 * Siempre, aunque la barbería tenga la auto-confirmación prendida — igual que
 * el que carga el dueño. Que lo confirme quien corresponda es una decisión
 * aparte de haberlo anotado.
 */

const MAX_NOMBRE = 80;
const MAX_COMENTARIO = 300;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const slug = texto(body.barbershopSlug);
  const serviceId = texto(body.serviceId);
  const customerName = texto(body.customerName).slice(0, MAX_NOMBRE);
  const customerPhone = texto(body.customerPhone);
  const date = texto(body.date);
  const time = texto(body.time);
  const comment = texto(body.comment).slice(0, MAX_COMENTARIO);

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

  if (!access.access.permisos.cargarTurno) {
    return NextResponse.json(
      { error: "El dueño de la barbería no habilitó que cargues turnos." },
      { status: 403 },
    );
  }

  if (!customerName) {
    return NextResponse.json(
      { error: "Poné el nombre del cliente." },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "Horario inválido." }, { status: 400 });
  }

  // Escribir en una barbería vencida no se puede, para el empleado igual que
  // para el dueño.
  const plan = await assertPlanActive(slug);
  if (!plan.ok) {
    return NextResponse.json({ error: plan.error }, { status: plan.status });
  }

  const supabase = getSupabaseAdminClient();

  // El servicio tiene que ser de SU barbero y de ESTA barbería. De acá salen
  // el nombre, el precio y la duración: nunca del body.
  const { data: servicio } = await supabase
    .from("barber_services")
    .select("id, name, price, duration_minutes")
    .eq("id", serviceId)
    .eq("barbershop_slug", slug)
    .eq("barber_id", access.access.barberId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (!servicio) {
    return NextResponse.json(
      { error: "Ese servicio no es tuyo." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      barbershop_slug: slug,
      barber_id: access.access.barberId,
      barber_name: access.access.barberName,
      customer_name: customerName,
      customer_phone: customerPhone || "",
      customer_email: null,
      service_name: servicio.name,
      service_price: servicio.price,
      service_duration_minutes: servicio.duration_minutes,
      appointment_date: date,
      appointment_time: `${time}:00`,
      comment,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // 23505 = índice único → ya hay un turno de este barbero en ese horario.
    // Es el mismo mecanismo que frena una doble reserva desde la web: la
    // guarda vive en la base, no en un chequeo previo que deja una ventana.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya tenés un turno en ese horario." },
        { status: 409 },
      );
    }
    Sentry.captureException(error, { tags: { route: "staff/appointment" } });
    return NextResponse.json(
      { error: "No pudimos cargar el turno." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
