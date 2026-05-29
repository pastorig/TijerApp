import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

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

  const auth = await assertAdminOfBarbershop(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
