import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { calculateCommissions } from "@/lib/commissions";
import {
  barberIdForAppointments,
  resolveStaffAccess,
} from "@/lib/server/staff-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/staff/earnings?bs=<slug>&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 *
 * Lo que el empleado lleva ganado por comisión en el período.
 *
 * ── El número tiene que ser EL MISMO que ve el dueño ────────────────────────
 * Por eso se usa `calculateCommissions` (feature 014), la misma función que
 * alimenta Reportes, el PDF y el WhatsApp de liquidación. Si acá se hiciera la
 * cuenta aparte, tarde o temprano daría distinto — y una diferencia en la
 * liquidación de un empleado es una discusión con plata de por medio.
 *
 * ── Qué turnos cuentan ──────────────────────────────────────────────────────
 * Confirmados y pendientes, igual que la producción que ve el dueño. Un turno
 * cancelado no es plata que entró.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("bs") ?? "";
  const desde = url.searchParams.get("desde") ?? "";
  const hasta = url.searchParams.get("hasta") ?? "";

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

  const fechaOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!fechaOk(desde) || !fechaOk(hasta) || desde > hasta) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("service_price, status")
    .eq("barbershop_slug", slug)
    .eq("barber_id", barberIdForAppointments(access.access))
    .gte("appointment_date", desde)
    .lte("appointment_date", hasta)
    .in("status", ["confirmed", "pending"]);

  if (error) {
    Sentry.captureException(error, { tags: { route: "staff/earnings" } });
    return NextResponse.json(
      { error: "No pudimos calcular tus ganancias." },
      { status: 500 },
    );
  }

  const turnos = (data ?? []) as Array<{ service_price: number | null }>;
  const produccion = turnos.reduce(
    (suma, t) => suma + (t.service_price ?? 0),
    0,
  );

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
    periodo: { desde, hasta },
    turnos: turnos.length,
    produccion,
    // `null` cuando el dueño todavía no le configuró la comisión. La pantalla
    // lo dice con todas las letras en vez de mostrar $0, que se leería como
    // "no ganaste nada".
    comisionPorcentaje: fila ? fila.commissionPercent : null,
    comision: fila ? fila.commission : null,
  });
}
