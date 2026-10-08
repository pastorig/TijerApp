import { NextResponse } from "next/server";
import { productosDeTurnos } from "@/lib/server/productos";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { calculateCommissions } from "@/lib/commissions";
import { getBarbershopPlan } from "@/lib/plan-access";
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
      // `actual_duration_minutes` e `is_sobreturno` los necesita el calendario
      // (feature 032): sin ellos un turno alargado se dibuja corto y un
      // sobreturno parece una doble reserva.
      "id, customer_name, customer_phone, service_name, service_price, service_duration_minutes, actual_duration_minutes, is_sobreturno, appointment_date, appointment_time, comment, status, deposit_status",
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

  // Productos que los clientes sumaron a estos turnos (035). El empleado los
  // ve siempre, sin un permiso aparte: es parte de lo que tiene que saber para
  // atender. Una consulta para todos los turnos del día; si falla, vacío.
  const productosPorTurno = await productosDeTurnos(
    (data ?? []).map((turno) => turno.id as string),
  );

  // Los bloqueos del día (feature 023). Van con los turnos y no en un pedido
  // aparte: son parte de "qué pasa hoy en mi agenda".
  const { data: bloqueos } = await supabase
    .from("barber_time_blocks")
    .select("id, start_time, end_time, reason")
    .eq("barbershop_slug", slug)
    .eq("barber_id", access.access.barberId)
    .eq("block_date", date)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("start_time", { ascending: true });
  const turnos = (data ?? []) as Array<{
    service_price: number | null;
    status: string;
  }>;

  // La jornada del día, para dibujar el calendario (feature 032): horario,
  // pausa y excepción. Son las MISMAS consultas que usa la disponibilidad
  // (`slot-availability.ts`) y van crudas, para que la pantalla las resuelva
  // con la misma función que la agenda del dueño: si acá se calculara aparte,
  // tarde o temprano las dos agendas dibujarían días distintos.
  //
  // Solo las filas de SU barbero. Si alguna consulta falla, el calendario cae
  // al horario general: es un dibujo, no decide qué se puede reservar.
  const [shopRes, semanalRes, excepcionRes, plan] = await Promise.all([
    supabase
      .from("barbershops")
      .select("working_hours_start, working_hours_end, slot_interval_minutes")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("barber_weekly_schedules")
      .select(
        "day_of_week, start_time, end_time, is_working, break_start, break_end",
      )
      .eq("barbershop_slug", slug)
      .eq("barber_id", access.access.barberId),
    supabase
      .from("barber_day_overrides")
      .select(
        "override_date, start_time, end_time, is_working, hereda_pausa, break_start, break_end",
      )
      .eq("barbershop_slug", slug)
      .eq("barber_id", access.access.barberId)
      .eq("override_date", date)
      .maybeSingle(),
    getBarbershopPlan(slug),
  ]);

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
    // El id de SU barbero, resuelto del token. Va de vuelta para que el
    // calendario arme su columna; nunca se recibe.
    barberId: access.access.barberId,
    permisos,
    horario: {
      semanal: semanalRes.data ?? [],
      excepcion: excepcionRes.data ?? null,
      barberia: {
        start: shopRes.data?.working_hours_start ?? "09:00",
        end: shopRes.data?.working_hours_end ?? "21:00",
        intervalMinutes: shopRes.data?.slot_interval_minutes ?? 30,
      },
    },
    // Plan vencido: se ve todo y no se escribe nada, igual que el dueño.
    soloLectura: plan.isReadOnly,
    bloqueos: bloqueos ?? [],
    turnos: (data ?? []).map((turno) => ({
      ...recortarTurno(turno, permisos),
      productos: productosPorTurno[turno.id as string] ?? [],
    })),
    // La plata solo si la puede ver. `undefined` no llega al JSON, así que la
    // pantalla no tiene que distinguir "no permitido" de "sin configurar".
    produccionDelDia: permisos.verGanancias ? produccion : undefined,
    // null = el dueño todavía no le configuró comisión. No es cero.
    comisionDelDia: permisos.verGanancias && fila ? fila.commission : undefined,
  });
}
