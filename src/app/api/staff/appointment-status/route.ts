import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanActive } from "@/lib/api-plan-guard";
import {
  barberIdForAppointments,
  resolveStaffAccess,
} from "@/lib/server/staff-access";

export const runtime = "nodejs";

/**
 * POST /api/staff/appointment-status
 * Body: { barbershopSlug, appointmentId, status: "confirmed" | "cancelled" }
 *
 * El empleado confirma o cancela **un turno suyo**.
 *
 * ── Las tres guardas, en orden ──────────────────────────────────────────────
 * 1. Tiene acceso a esta barbería (y con eso sabemos qué barbero es).
 * 2. El plan está al día: con el plan vencido la barbería es de lectura, para
 *    el empleado igual que para el dueño.
 * 3. **El turno es de SU barbero.** Va dentro del propio update, no como un
 *    select previo: si se preguntara antes y se escribiera después, entre una
 *    cosa y la otra hay una ventana.
 *
 * Y queda registrado quién lo hizo. Hasta ahora no hacía falta porque había una
 * sola cuenta por barbería; con empleados, el dueño va a querer saber quién
 * canceló qué.
 */

const ESTADOS_PERMITIDOS = ["confirmed", "cancelled"] as const;
type EstadoPermitido = (typeof ESTADOS_PERMITIDOS)[number];

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const slug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  const appointmentId =
    typeof body.appointmentId === "string" ? body.appointmentId : "";
  const status = typeof body.status === "string" ? body.status : "";

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

  if (!appointmentId) {
    return NextResponse.json({ error: "Falta el turno." }, { status: 400 });
  }
  if (!ESTADOS_PERMITIDOS.includes(status as EstadoPermitido)) {
    // El empleado solo confirma o cancela. No puede, por ejemplo, mandar
    // "deleted" y borrar un turno del historial de la barbería.
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const plan = await assertPlanActive(slug);
  if (!plan.ok) {
    return NextResponse.json({ error: plan.error }, { status: plan.status });
  }

  const supabase = getSupabaseAdminClient();

  // La guarda del barbero va DENTRO del update. Que el turno sea suyo se
  // verifica y se escribe en la misma operación.
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: status as EstadoPermitido,
      status_changed_by: access.access.userId,
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("barbershop_slug", slug)
    .eq("barber_id", barberIdForAppointments(access.access))
    .neq("status", "deleted")
    .select("id, status")
    .maybeSingle();

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "staff/appointment-status" },
    });
    return NextResponse.json(
      { error: "No pudimos actualizar el turno." },
      { status: 500 },
    );
  }

  if (!data) {
    // No existe, o es de otro barbero, o está borrado. Al empleado se le
    // responde lo mismo en los tres casos: si dijéramos "ese turno es de otro
    // barbero" estaríamos confirmando que existe.
    Sentry.captureMessage("Empleado intentó tocar un turno que no es suyo", {
      level: "warning",
      tags: { route: "staff/appointment-status" },
      extra: { slug, appointmentId, barberId: access.access.barberId },
    });
    return NextResponse.json(
      { error: "Ese turno no está en tu agenda." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, turno: data });
}
