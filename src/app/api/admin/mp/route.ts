import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanFeature } from "@/lib/api-plan-guard";
import { testMPConnection } from "@/lib/mercadopago/client";

export const runtime = "nodejs";

/**
 * /api/admin/mp
 *
 *   GET ?barbershopSlug=...&action=test-connection
 *     → Llama MP /users/me con el access_token guardado y devuelve el
 *       resultado para mostrar al admin "conectado como X" o el error.
 *
 *   PATCH body {barbershopSlug, mp_enabled?, mp_access_token?, mp_public_key?,
 *               mp_user_id?, deposit_percent?, deposit_min_amount?,
 *               deposit_auto_cancel_hours?}
 *     → Actualiza la config MP de la barbería. Solo admin de la barbería.
 *
 *   POST body {barbershopSlug, accessToken}
 *     → Test de conexión SIN guardar. Sirve para "probar antes de guardar".
 */

async function assertAdmin(
  authHeader: string | null,
  barbershopSlug: string,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }
> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  const supabase = getSupabaseAdminClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (userError || !userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }
  const { data: adminRow } = await supabase
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();
  if (!adminRow) {
    return { ok: false, status: 403, error: "No sos admin de esta barbería." };
  }
  return { ok: true, userId: userResult.user.id };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barbershopSlug = searchParams.get("barbershopSlug") ?? "";
  const action = searchParams.get("action") ?? "";

  if (!barbershopSlug) {
    return NextResponse.json(
      { error: "Falta barbershopSlug." },
      { status: 400 },
    );
  }
  const auth = await assertAdmin(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const gate = await assertPlanFeature(barbershopSlug, "cobros_online");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const supabase = getSupabaseAdminClient();

  if (action === "test-connection") {
    // Lee el access_token guardado y testea
    const { data: bs } = await supabase
      .from("barbershops")
      .select("mp_access_token")
      .eq("slug", barbershopSlug)
      .maybeSingle();

    const token = (bs as { mp_access_token?: string | null } | null)
      ?.mp_access_token;
    if (!token) {
      return NextResponse.json(
        { error: "No hay access token configurado." },
        { status: 400 },
      );
    }
    const result = await testMPConnection(token);
    return NextResponse.json(result);
  }

  // GET default: devolver settings actuales (sin exponer el access_token completo)
  const { data: bs } = await supabase
    .from("barbershops")
    .select(
      "mp_enabled, mp_public_key, mp_user_id, deposit_percent, deposit_min_amount, deposit_auto_cancel_hours, mp_access_token",
    )
    .eq("slug", barbershopSlug)
    .maybeSingle();

  if (!bs) {
    return NextResponse.json({ error: "Barbería no encontrada." }, { status: 404 });
  }

  type SettingsRow = {
    mp_enabled: boolean;
    mp_public_key: string | null;
    mp_user_id: string | null;
    deposit_percent: number;
    deposit_min_amount: number | null;
    deposit_auto_cancel_hours: number;
    mp_access_token: string | null;
  };
  const row = bs as SettingsRow;

  // Devolvemos solo los últimos 4 chars del access_token para que el admin
  // pueda reconocerlo sin exponer el secret entero.
  const tokenMasked = row.mp_access_token
    ? `••••${row.mp_access_token.slice(-4)}`
    : null;

  return NextResponse.json({
    settings: {
      mp_enabled: row.mp_enabled,
      mp_public_key: row.mp_public_key,
      mp_user_id: row.mp_user_id,
      deposit_percent: row.deposit_percent,
      deposit_min_amount: row.deposit_min_amount,
      deposit_auto_cancel_hours: row.deposit_auto_cancel_hours,
      mp_access_token_masked: tokenMasked,
      has_access_token: Boolean(row.mp_access_token),
    },
  });
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  if (!barbershopSlug) {
    return NextResponse.json({ error: "Falta barbershopSlug." }, { status: 400 });
  }
  const auth = await assertAdmin(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const gate = await assertPlanFeature(barbershopSlug, "cobros_online");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  // Solo los campos válidos del body
  const update: Record<string, unknown> = {};

  if (typeof body.mp_enabled === "boolean") {
    update.mp_enabled = body.mp_enabled;
  }
  if (typeof body.mp_access_token === "string") {
    // Permitimos string vacío para borrarlo
    update.mp_access_token = body.mp_access_token.trim() || null;
  }
  if (typeof body.mp_public_key === "string") {
    update.mp_public_key = body.mp_public_key.trim() || null;
  }
  if (typeof body.mp_user_id === "string") {
    update.mp_user_id = body.mp_user_id.trim() || null;
  }
  if (typeof body.deposit_percent === "number") {
    const p = Math.floor(body.deposit_percent);
    if (p < 1 || p > 100) {
      return NextResponse.json(
        { error: "El porcentaje debe estar entre 1 y 100." },
        { status: 400 },
      );
    }
    update.deposit_percent = p;
  }
  if ("deposit_min_amount" in body) {
    if (body.deposit_min_amount === null) {
      update.deposit_min_amount = null;
    } else if (typeof body.deposit_min_amount === "number" && body.deposit_min_amount > 0) {
      update.deposit_min_amount = Math.floor(body.deposit_min_amount);
    }
  }
  if (typeof body.deposit_auto_cancel_hours === "number") {
    const h = Math.floor(body.deposit_auto_cancel_hours);
    if (h < 1 || h > 168) {
      return NextResponse.json(
        { error: "Horas debe estar entre 1 y 168 (7 días)." },
        { status: 400 },
      );
    }
    update.deposit_auto_cancel_hours = h;
  }

  // Si están intentando activar mp_enabled pero NO hay access_token guardado
  // ni se está enviando uno nuevo, rechazamos.
  if (update.mp_enabled === true && !update.mp_access_token) {
    const supabase = getSupabaseAdminClient();
    const { data: existing } = await supabase
      .from("barbershops")
      .select("mp_access_token")
      .eq("slug", barbershopSlug)
      .maybeSingle();
    const has = (existing as { mp_access_token?: string | null } | null)
      ?.mp_access_token;
    if (!has) {
      return NextResponse.json(
        {
          error:
            "Para activar Mercado Pago necesitás cargar primero el Access Token.",
        },
        { status: 400 },
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  // Cast: el supabase-js generic exige tipo exacto de BarbershopUpdate, pero
  // construir un objeto con ese tipo desde el body (que es Record<string,unknown>)
  // requiere narrowing por cada campo. Lo que estamos haciendo es seguro: el
  // narrowing manual con typeof e in checks arriba garantiza que update solo
  // contiene campos válidos del Update type.
  const { error: updateError } = await supabase
    .from("barbershops")
    .update(update as never)
    .eq("slug", barbershopSlug);

  if (updateError) {
    Sentry.captureException(updateError, { tags: { route: "admin/mp" } });
    return NextResponse.json(
      { error: "No pudimos guardar la configuración." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  // POST = test directo con un token enviado por el cliente (sin guardarlo).
  // Útil cuando el admin pega su access_token y quiere probarlo antes de guardar.
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  const accessToken =
    typeof body.accessToken === "string" ? body.accessToken.trim() : "";

  if (!barbershopSlug || !accessToken) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
      { status: 400 },
    );
  }

  const auth = await assertAdmin(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const gate = await assertPlanFeature(barbershopSlug, "cobros_online");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const result = await testMPConnection(accessToken);
  return NextResponse.json(result);
}
