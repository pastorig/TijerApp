import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const barbershopSelectFields =
  "id, created_at, slug, name, description, whatsapp, instagram, address, logo_url, google_reviews_url, working_hours_start, working_hours_end, slot_interval_minutes, is_active";

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

function asTrimmedOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function isValidTimeValue(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export async function PATCH(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Body inválido." },
      { status: 400 },
    );
  }

  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  if (!barbershopSlug) {
    return NextResponse.json(
      { error: "Falta barbershopSlug." },
      { status: 400 },
    );
  }

  const name =
    typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "El nombre es obligatorio." },
      { status: 400 },
    );
  }

  const startTime =
    typeof payload.workingHoursStart === "string"
      ? payload.workingHoursStart
      : "";
  const endTime =
    typeof payload.workingHoursEnd === "string"
      ? payload.workingHoursEnd
      : "";
  if (!isValidTimeValue(startTime) || !isValidTimeValue(endTime)) {
    return NextResponse.json(
      { error: "Horario inválido." },
      { status: 400 },
    );
  }
  if (startTime >= endTime) {
    return NextResponse.json(
      { error: "El cierre debe ser posterior a la apertura." },
      { status: 400 },
    );
  }

  const intervalValue = Number(payload.slotIntervalMinutes);
  if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
    return NextResponse.json(
      { error: "El intervalo debe ser mayor a cero." },
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

  // Verificamos primero que el barbershop exista en la DB. Si solo está
  // en el fallback demo (demo-barbershops.ts) y no en la tabla, lo
  // creamos con upsert para que el update siguiente funcione.
  const { data: existing } = await supabaseAdmin
    .from("barbershops")
    .select("id")
    .eq("slug", barbershopSlug)
    .maybeSingle();

  if (!existing) {
    // Crear el row primero con upsert.
    const { error: upsertError } = await supabaseAdmin
      .from("barbershops")
      .upsert(
        {
          slug: barbershopSlug,
          name,
          description: asTrimmedOrNull(payload.description),
          whatsapp: asTrimmedOrNull(payload.whatsapp),
          instagram: asTrimmedOrNull(payload.instagram),
          address: asTrimmedOrNull(payload.address),
          google_reviews_url: asTrimmedOrNull(payload.googleReviewsUrl),
          working_hours_start: startTime,
          working_hours_end: endTime,
          slot_interval_minutes: intervalValue,
          is_active: Boolean(payload.isActive ?? true),
        },
        { onConflict: "slug" },
      );
    if (upsertError) {
      Sentry.captureException(upsertError);
      console.error("[barbershop-settings] upsert error", upsertError);
      return NextResponse.json(
        {
          error: "No pudimos crear la barbería en la base.",
          debug: upsertError.message,
          code: upsertError.code,
        },
        { status: 500 },
      );
    }
  }

  const { data: barbershop, error: updateError } = await supabaseAdmin
    .from("barbershops")
    .update({
      name,
      description: asTrimmedOrNull(payload.description),
      whatsapp: asTrimmedOrNull(payload.whatsapp),
      instagram: asTrimmedOrNull(payload.instagram),
      address: asTrimmedOrNull(payload.address),
      working_hours_start: startTime,
      working_hours_end: endTime,
      slot_interval_minutes: intervalValue,
      is_active: Boolean(payload.isActive ?? true),
    })
    .eq("slug", barbershopSlug)
    .select(barbershopSelectFields)
    .single();

  if (updateError || !barbershop) {
    Sentry.captureException(updateError);
    console.error("[barbershop-settings] update error", updateError);
    return NextResponse.json(
      {
        error: "No pudimos guardar la configuración.",
        debug: updateError?.message ?? "no barbershop returned",
        code: updateError?.code ?? null,
        details: updateError?.details ?? null,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, barbershop });
}
