import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolveStaffAccess } from "@/lib/server/staff-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/staff/services?bs=<slug>
 *
 * Los servicios activos **de su barbero**, para el turno que carga a mano.
 *
 * Igual que el resto de `/api/staff/*`: el barbero sale del token. Acá importa
 * el doble, porque esta lista es la que después valida el POST — si devolviera
 * los servicios de toda la barbería, el empleado podría cargarse un turno con
 * el precio de un servicio que no es suyo y desviar su propia comisión.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("bs") ?? "";

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

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("barber_services")
    .select("id, name, price, duration_minutes")
    .eq("barbershop_slug", slug)
    .eq("barber_id", access.access.barberId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    Sentry.captureException(error, { tags: { route: "staff/services" } });
    return NextResponse.json(
      { error: "No pudimos traer tus servicios." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, servicios: data ?? [] });
}
