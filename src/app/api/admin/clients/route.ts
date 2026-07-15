import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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
