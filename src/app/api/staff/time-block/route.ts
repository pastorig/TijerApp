import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanActive } from "@/lib/api-plan-guard";
import {
  barberIdForAppointments,
  resolveStaffAccess,
} from "@/lib/server/staff-access";
import { turnosEnRango, validarRango } from "@/lib/staff-time-block";

export const runtime = "nodejs";

/**
 * POST   /api/staff/time-block  { barbershopSlug, date, desde, hasta, motivo? }
 * DELETE /api/staff/time-block  { barbershopSlug, blockId }
 *
 * El empleado tapa un rango suyo: franco, se va antes, el médico.
 *
 * Hasta ahora no tenía cómo decirlo, así que su horario seguía figurando libre
 * y le entraban reservas para un rato en el que no iba a estar. El resultado no
 * era un hueco de comodidad: era un cliente llegando a una barbería donde no lo
 * esperaba nadie.
 *
 * ── Bloquear NO cancela los turnos que quedan adentro ───────────────────────
 * A propósito. Cancelarle a un cliente es una decisión, no un efecto
 * secundario de marcar que te vas antes. Lo que sí se hace es **contarlos y
 * decírselo**: si bloquea de 17 a 20 y tenía un turno a las 18, ese turno sigue
 * en pie y él tiene que saberlo.
 *
 * ── Qué no llega del cliente ────────────────────────────────────────────────
 * El barbero. Sale del token, como en todos los endpoints de `/api/staff/*`.
 * Y al borrar, el bloqueo tiene que ser suyo: un id ajeno responde 404 y no
 * "ese bloqueo es de otro", que sería confirmar que existe.
 */

const MAX_MOTIVO = 120;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const slug = texto(body.barbershopSlug);
  const date = texto(body.date);
  const motivo = texto(body.motivo).slice(0, MAX_MOTIVO);

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

  if (!access.access.permisos.bloquearHorario) {
    return NextResponse.json(
      { error: "El dueño de la barbería no habilitó que bloquees horarios." },
      { status: 403 },
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const rango = validarRango(body.desde, body.hasta);
  if (!rango.ok) {
    return NextResponse.json({ error: rango.error }, { status: 400 });
  }

  const plan = await assertPlanActive(slug);
  if (!plan.ok) {
    return NextResponse.json({ error: plan.error }, { status: plan.status });
  }

  const supabase = getSupabaseAdminClient();
  const barberId = barberIdForAppointments(access.access);

  // Cuántos turnos suyos quedan pisados. Se mira ANTES de crear: si se mirara
  // después, un turno que entre en el medio se contaría como si ya hubiera
  // estado ahí.
  const { data: turnos } = await supabase
    .from("appointments")
    .select("appointment_time, service_duration_minutes, status")
    .eq("barbershop_slug", slug)
    .eq("barber_id", barberId)
    .eq("appointment_date", date)
    .neq("status", "deleted");

  const pisados = turnosEnRango(turnos ?? [], rango.desde, rango.hasta);

  const { data, error } = await supabase
    .from("barber_time_blocks")
    .insert({
      barbershop_slug: slug,
      barber_id: access.access.barberId,
      block_date: date,
      start_time: `${rango.desde}:00`,
      end_time: `${rango.hasta}:00`,
      reason: motivo || null,
      is_active: true,
      deleted_at: null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    Sentry.captureException(error, { tags: { route: "staff/time-block" } });
    return NextResponse.json(
      { error: "No pudimos bloquear ese horario." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: data?.id ?? null,
    turnosEnElRango: pisados,
  });
}

export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const slug = typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  const blockId = typeof body.blockId === "string" ? body.blockId : "";

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

  if (!access.access.permisos.bloquearHorario) {
    return NextResponse.json(
      { error: "El dueño de la barbería no habilitó que bloquees horarios." },
      { status: 403 },
    );
  }
  if (!blockId) {
    return NextResponse.json({ error: "Falta el bloqueo." }, { status: 400 });
  }

  const plan = await assertPlanActive(slug);
  if (!plan.ok) {
    return NextResponse.json({ error: plan.error }, { status: plan.status });
  }

  const supabase = getSupabaseAdminClient();

  // Baja lógica, igual que la del dueño. La guarda de que el bloqueo es SUYO va
  // dentro del propio update: preguntar antes y escribir después deja una
  // ventana entre las dos cosas.
  const { data, error } = await supabase
    .from("barber_time_blocks")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", blockId)
    .eq("barbershop_slug", slug)
    .eq("barber_id", access.access.barberId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "staff/time-block", op: "delete" },
    });
    return NextResponse.json(
      { error: "No pudimos sacar el bloqueo." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Ese bloqueo no está en tu agenda." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
