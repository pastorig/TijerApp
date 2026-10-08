import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanActive } from "@/lib/api-plan-guard";
import { resolveBarbershopAdminAccess } from "@/lib/server/barbershop-admin-access";
import { normalizePhone } from "@/lib/barbershop-clients";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const appointmentId =
    typeof payload.appointmentId === "string" ? payload.appointmentId : "";
  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";

  if (!appointmentId || !barbershopSlug) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
      { status: 400 },
    );
  }

  const auth = await resolveBarbershopAdminAccess(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Plan vencido => modo lectura: la barbería se puede leer, no escribir.
  const planGate = await assertPlanActive(barbershopSlug);
  if (!planGate.ok) {
    return NextResponse.json(
      { error: planGate.error },
      { status: planGate.status },
    );
  }

  const updateValues: {
    internal_notes?: string | null;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string | null;
    comment?: string;
  } = {};

  // ── Corregir los datos del cliente ─────────────────────────────────────
  // Un cliente reservó con el número mal escrito y la barbería no tenía cómo
  // arreglarlo. Se corrigen solo los datos de la persona y el comentario: el
  // servicio, el barbero, el día y la hora NO se aceptan por acá (cambiarlos
  // mueve la agenda y tiene sus propias validaciones en `/move`). Cada campo
  // se valida igual que cuando el cliente reserva.
  if ("customerName" in payload) {
    const nombre =
      typeof payload.customerName === "string" ? payload.customerName.trim() : "";
    if (!nombre || nombre.length > 80) {
      return NextResponse.json(
        { error: "El nombre no puede quedar vacío ni pasar de 80 letras." },
        { status: 400 },
      );
    }
    updateValues.customer_name = nombre;
  }
  if ("customerPhone" in payload) {
    const telefono =
      typeof payload.customerPhone === "string" ? payload.customerPhone.trim() : "";
    if (!normalizePhone(telefono) || telefono.length > 30) {
      return NextResponse.json(
        { error: "El teléfono tiene que tener al menos 8 dígitos." },
        { status: 400 },
      );
    }
    updateValues.customer_phone = telefono;
  }
  if ("customerEmail" in payload) {
    const mail =
      typeof payload.customerEmail === "string" ? payload.customerEmail.trim() : "";
    if (mail && (mail.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))) {
      return NextResponse.json(
        { error: "Ese mail no parece válido." },
        { status: 400 },
      );
    }
    updateValues.customer_email = mail ? mail.toLowerCase() : null;
  }
  if ("comment" in payload) {
    const comentario =
      typeof payload.comment === "string" ? payload.comment.trim() : "";
    if (comentario.length > 500) {
      return NextResponse.json(
        { error: "El comentario no puede pasar de 500 letras." },
        { status: 400 },
      );
    }
    // La columna no admite null: un comentario vacío se guarda como texto vacío.
    updateValues.comment = comentario;
  }

  if ("internalNotes" in payload) {
    const rawNotes =
      typeof payload.internalNotes === "string" ? payload.internalNotes : "";
    updateValues.internal_notes = rawNotes.trim() ? rawNotes.trim() : null;
  }

  if (Object.keys(updateValues).length === 0) {
    return NextResponse.json(
      { error: "Nada para actualizar." },
      { status: 400 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .update(updateValues)
    .eq("id", appointmentId)
    .eq("barbershop_slug", barbershopSlug)
    .select("id, internal_notes, customer_name, customer_phone, customer_email, comment")
    .single();

  if (error || !data) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "No pudimos actualizar el turno." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, appointment: data });
}

export async function DELETE(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  const appointmentId =
    typeof payload.appointmentId === "string" ? payload.appointmentId : "";
  const deleteAllDeleted = payload.deleteAllDeleted === true;

  if (!barbershopSlug || (!appointmentId && !deleteAllDeleted)) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
      { status: 400 },
    );
  }

  const auth = await resolveBarbershopAdminAccess(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Plan vencido => modo lectura: la barbería se puede leer, no escribir.
  const planGate = await assertPlanActive(barbershopSlug);
  if (!planGate.ok) {
    return NextResponse.json(
      { error: planGate.error },
      { status: planGate.status },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (deleteAllDeleted) {
    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("appointments")
      .delete()
      .eq("barbershop_slug", barbershopSlug)
      .eq("status", "deleted")
      .select("id");

    if (deleteError) {
      Sentry.captureException(deleteError);
      return NextResponse.json(
        { error: "No pudimos borrar los turnos." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, deletedCount: deletedRows?.length ?? 0 });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("appointments")
    .select("id, status, barbershop_slug")
    .eq("id", appointmentId)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();

  if (existingError) {
    Sentry.captureException(existingError);
    return NextResponse.json(
      { error: "No pudimos validar la reserva." },
      { status: 500 },
    );
  }
  if (!existing) {
    return NextResponse.json(
      { error: "No encontramos la reserva." },
      { status: 404 },
    );
  }
  if (existing.status !== "deleted") {
    return NextResponse.json(
      { error: "Solo se pueden borrar definitivamente turnos eliminados." },
      { status: 409 },
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .eq("barbershop_slug", barbershopSlug);

  if (deleteError) {
    Sentry.captureException(deleteError);
    return NextResponse.json(
      { error: "No pudimos borrar la reserva." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
