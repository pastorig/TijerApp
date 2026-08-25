import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { contarPorDia } from "@/lib/staff-agenda-counts";
import {
  barberIdForAppointments,
  resolveStaffAccess,
} from "@/lib/server/staff-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Un mes de calendario más los bordes; más que eso no lo pide ninguna vista. */
const MAX_DIAS = 70;

/**
 * GET /api/staff/agenda-counts?bs=<slug>&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Cuántos turnos tiene el empleado cada día del rango. Es lo que pinta los
 * puntitos del calendario: sin esto, abrir el mes completo no dice nada.
 *
 * Mismas reglas que `/api/staff/agenda`, y por los mismos motivos: el barbero
 * sale del token y **nunca** del request, y sólo se devuelve el número — ni un
 * nombre de cliente ni un horario, que para un punto no hacen falta.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("bs") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

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

  const formatoOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!formatoOk(from) || !formatoOk(to) || from > to) {
    return NextResponse.json({ error: "Rango inválido." }, { status: 400 });
  }

  // Un rango abierto sería un "traeme todos los turnos de la historia" que
  // cualquiera puede pedir con un token válido. El tope lo corta.
  const dias =
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000 +
    1;
  if (dias > MAX_DIAS) {
    return NextResponse.json(
      { error: "Rango demasiado largo." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("appointment_date, status")
    .eq("barbershop_slug", slug)
    .eq("barber_id", barberIdForAppointments(access.access))
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .neq("status", "deleted");

  if (error) {
    Sentry.captureException(error, { tags: { route: "staff/agenda-counts" } });
    return NextResponse.json(
      { error: "No pudimos traer tu calendario." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    conteos: contarPorDia(data ?? []),
  });
}
