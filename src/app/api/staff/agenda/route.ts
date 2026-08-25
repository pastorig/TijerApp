import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  barberIdForAppointments,
  resolveStaffAccess,
} from "@/lib/server/staff-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/staff/agenda?bs=<slug>&date=YYYY-MM-DD
 *
 * Los turnos del empleado para un día. **Solo los suyos.**
 *
 * El barbero no se recibe: se resuelve del acceso del usuario logueado. Si
 * viniera del request, el empleado vería la agenda de un compañero cambiando
 * un id.
 *
 * Tampoco se devuelve todo el turno: va lo que hace falta para atender. El
 * precio del servicio SÍ, porque de ahí sale su comisión y ya lo ve en
 * Ganancias; el email del cliente no, que no le hace falta para nada.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("bs") ?? "";
  const date = url.searchParams.get("date") ?? "";

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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, customer_name, customer_phone, service_name, service_price, service_duration_minutes, appointment_date, appointment_time, comment, status, deposit_status",
    )
    .eq("barbershop_slug", slug)
    .eq("barber_id", barberIdForAppointments(access.access))
    .eq("appointment_date", date)
    .neq("status", "deleted")
    .order("appointment_time", { ascending: true });

  if (error) {
    Sentry.captureException(error, { tags: { route: "staff/agenda" } });
    return NextResponse.json(
      { error: "No pudimos traer tus turnos." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    barbero: access.access.barberName,
    turnos: data ?? [],
  });
}
