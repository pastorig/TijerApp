import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { calculateCommissions } from "@/lib/commissions";
import { recortarTurno } from "@/lib/staff-permissions";
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
 * email del cliente no, que no le hace falta para nada.
 *
 * Y desde la feature 019, lo que va depende de los permisos que le dio el
 * dueño: sin "ver lo que gana" el precio no viaja, y sin "escribirle al
 * cliente" el teléfono tampoco. **Se recortan acá, del payload.** Ocultarlos
 * en la pantalla dejaría el dato a un clic de las herramientas del navegador,
 * y el dueño creyendo que lo apagó.
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

  const permisos = access.access.permisos;
  const turnos = (data ?? []) as Array<{
    service_price: number | null;
    status: string;
  }>;

  // Lo que va a ganar HOY, con la misma función que el resto (feature 014).
  // Es el dato que un barbero mira mientras labura, y tenía que estar en la
  // agenda y no escondido en otra pestaña. Cuenta confirmados y pendientes: un
  // turno cancelado no es plata que entra.
  const produccion = turnos
    .filter((t) => t.status === "confirmed" || t.status === "pending")
    .reduce((suma, t) => suma + (t.service_price ?? 0), 0);

  const resumen = calculateCommissions([
    {
      barberId: access.access.barberId,
      name: access.access.barberName,
      revenue: produccion,
      commissionPercent: access.access.commissionPercent,
    },
  ]);
  const fila = resumen.rows[0] ?? null;

  return NextResponse.json({
    ok: true,
    barbero: access.access.barberName,
    barberia: access.access.barbershopSlug,
    permisos,
    turnos: (data ?? []).map((turno) => recortarTurno(turno, permisos)),
    // La plata solo si la puede ver. `undefined` no llega al JSON, así que la
    // pantalla no tiene que distinguir "no permitido" de "sin configurar".
    produccionDelDia: permisos.verGanancias ? produccion : undefined,
    // null = el dueño todavía no le configuró comisión. No es cero.
    comisionDelDia: permisos.verGanancias && fila ? fila.commission : undefined,
  });
}
