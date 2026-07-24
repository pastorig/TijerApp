import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanActive } from "@/lib/api-plan-guard";

export const runtime = "nodejs";

const clientSelect =
  "id, created_at, updated_at, barbershop_slug, phone_normalized, phone_display, name, email, notes, tags, deleted_at";

async function assertAdminOfBarbershop(
  authHeader: string | null,
  barbershopSlug: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  const accessToken = authHeader.slice("Bearer ".length);
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }

  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();

  if (adminError) {
    return { ok: false, status: 500, error: "Error validando permisos." };
  }
  if (!adminRow) {
    return { ok: false, status: 403, error: "No sos admin de esta barbería." };
  }
  return { ok: true };
}

export async function PATCH(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const clientId =
    typeof payload.clientId === "string" ? payload.clientId : "";
  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  if (!clientId || !barbershopSlug) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
      { status: 400 },
    );
  }

  const auth = await assertAdminOfBarbershop(
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
    name?: string;
    notes?: string | null;
    tags?: string[];
  } = {};

  if (typeof payload.name === "string" && payload.name.trim()) {
    updateValues.name = payload.name.trim();
  }
  if ("notes" in payload) {
    const notesValue =
      typeof payload.notes === "string" && payload.notes.trim()
        ? payload.notes.trim()
        : null;
    updateValues.notes = notesValue;
  }
  if (Array.isArray(payload.tags)) {
    updateValues.tags = (payload.tags as unknown[])
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim());
  }

  if (Object.keys(updateValues).length === 0) {
    return NextResponse.json(
      { error: "Nada para actualizar." },
      { status: 400 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: client, error: updateError } = await supabaseAdmin
    .from("barbershop_clients")
    .update(updateValues)
    .eq("id", clientId)
    .eq("barbershop_slug", barbershopSlug)
    .select(clientSelect)
    .single();

  if (updateError || !client) {
    Sentry.captureException(updateError);
    console.error("[clients] update error", updateError);
    return NextResponse.json(
      { error: "No pudimos guardar los cambios." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, client });
}

/** Normaliza un teléfono igual que la función SQL: solo dígitos, null si <8. */
function normalizePhoneServer(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

/**
 * Separa turnos hacia otro cliente (por teléfono). Caso de uso: un mismo
 * número lo usaron varias personas (alguien reservó para un grupo), así que
 * quedaron mezcladas en un solo cliente. Con esto el barbero mueve los turnos
 * de una persona a SU número real → pasan a ser un cliente aparte con su
 * conteo correcto.
 *
 * Mueve customer_phone (+ customer_name) de los turnos indicados y hace upsert
 * del cliente destino (el trigger sync_client solo corre en INSERT, no en
 * UPDATE, por eso lo creamos acá). Los otros triggers de appointments son
 * INSERT-only (push, cupón) o idempotentes (sello), así que mover el teléfono
 * es seguro.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  const newPhoneRaw =
    typeof payload.newPhone === "string" ? payload.newPhone.trim() : "";
  const newName =
    typeof payload.newName === "string" ? payload.newName.trim() : "";
  const appointmentIds = Array.isArray(payload.appointmentIds)
    ? (payload.appointmentIds as unknown[]).filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : [];

  if (!barbershopSlug || appointmentIds.length === 0 || !newPhoneRaw) {
    return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  }

  const phoneNormalized = normalizePhoneServer(newPhoneRaw);
  if (!phoneNormalized) {
    return NextResponse.json(
      { error: "El teléfono no es válido (necesita al menos 8 dígitos)." },
      { status: 400 },
    );
  }

  const auth = await assertAdminOfBarbershop(
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

  // 1) Mover los turnos al nuevo teléfono (+ nombre si se pasó).
  const apptUpdate: { customer_phone: string; customer_name?: string } = {
    customer_phone: newPhoneRaw,
  };
  if (newName) apptUpdate.customer_name = newName;

  const { error: moveError, count } = await supabaseAdmin
    .from("appointments")
    .update(apptUpdate, { count: "exact" })
    .eq("barbershop_slug", barbershopSlug)
    .in("id", appointmentIds);

  if (moveError) {
    Sentry.captureException(moveError);
    console.error("[clients] reassign move error", moveError);
    return NextResponse.json(
      { error: "No pudimos mover los turnos." },
      { status: 500 },
    );
  }

  // 2) Crear/actualizar el cliente destino (el trigger no corre en UPDATE).
  const { error: upsertError } = await supabaseAdmin
    .from("barbershop_clients")
    .upsert(
      {
        barbershop_slug: barbershopSlug,
        phone_normalized: phoneNormalized,
        phone_display: newPhoneRaw,
        name: newName || "Cliente",
        deleted_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "barbershop_slug,phone_normalized" },
    );

  if (upsertError) {
    Sentry.captureException(upsertError);
    console.error("[clients] reassign upsert error", upsertError);
    return NextResponse.json(
      { error: "Movimos los turnos pero no pudimos crear el cliente nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, moved: count ?? appointmentIds.length });
}

/**
 * Borra (soft-delete) un cliente: marca `deleted_at`. NO toca los turnos
 * (el historial se preserva); el cliente simplemente deja de aparecer en el
 * listado (listClientsByBarbershop filtra deleted_at IS NULL). Si el mismo
 * teléfono vuelve a reservar, el trigger de DB recrea/reactiva el cliente.
 */
export async function DELETE(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const clientId = typeof payload.clientId === "string" ? payload.clientId : "";
  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  if (!clientId || !barbershopSlug) {
    return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  }

  const auth = await assertAdminOfBarbershop(
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
  const { error: deleteError } = await supabaseAdmin
    .from("barbershop_clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", clientId)
    .eq("barbershop_slug", barbershopSlug)
    .is("deleted_at", null);

  if (deleteError) {
    Sentry.captureException(deleteError);
    console.error("[clients] delete error", deleteError);
    return NextResponse.json(
      { error: "No pudimos eliminar el cliente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
