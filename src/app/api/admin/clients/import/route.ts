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

function normalizePhone(rawPhone: string): string {
  return rawPhone.replace(/\D+/g, "");
}

type ImportClientInput = {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags?: string[];
};

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  const clientsRaw = Array.isArray(payload.clients) ? payload.clients : null;

  if (!barbershopSlug || !clientsRaw) {
    return NextResponse.json(
      { error: "Faltan parámetros (barbershopSlug, clients[])." },
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

  // Sanitizar input
  const cleanClients: ImportClientInput[] = [];
  const invalid: Array<{ index: number; reason: string }> = [];
  for (let i = 0; i < clientsRaw.length; i++) {
    const row = clientsRaw[i] as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const phone = typeof row.phone === "string" ? row.phone.trim() : "";
    if (!name) {
      invalid.push({ index: i, reason: "Sin nombre" });
      continue;
    }
    if (!phone || normalizePhone(phone).length < 6) {
      invalid.push({ index: i, reason: "Teléfono inválido" });
      continue;
    }
    cleanClients.push({
      name,
      phone,
      email: typeof row.email === "string" ? row.email.trim() : undefined,
      notes: typeof row.notes === "string" ? row.notes.trim() : undefined,
      tags: Array.isArray(row.tags)
        ? row.tags
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    });
  }

  if (cleanClients.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        created: 0,
        skipped: 0,
        invalid: invalid.length,
        invalidRows: invalid,
      },
      { status: 200 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  // Traer phones existentes para skip de duplicados
  const phonesNormalized = cleanClients.map((c) => normalizePhone(c.phone));
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("barbershop_clients")
    .select("phone_normalized")
    .eq("barbershop_slug", barbershopSlug)
    .in("phone_normalized", phonesNormalized);

  if (existingError) {
    Sentry.captureException(existingError);
    return NextResponse.json(
      { error: "No pudimos validar duplicados." },
      { status: 500 },
    );
  }

  const existingPhones = new Set(
    (existing ?? []).map((r) => r.phone_normalized),
  );

  const toInsert = cleanClients
    .filter((c) => !existingPhones.has(normalizePhone(c.phone)))
    .map((c) => ({
      barbershop_slug: barbershopSlug,
      phone_normalized: normalizePhone(c.phone),
      phone_display: c.phone,
      name: c.name,
      email: c.email || null,
      notes: c.notes || null,
      tags: c.tags ?? [],
    }));

  const skipped = cleanClients.length - toInsert.length;

  if (toInsert.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        created: 0,
        skipped,
        invalid: invalid.length,
        invalidRows: invalid,
      },
      { status: 200 },
    );
  }

  const { error: insertError } = await supabaseAdmin
    .from("barbershop_clients")
    .insert(toInsert);

  if (insertError) {
    Sentry.captureException(insertError);
    return NextResponse.json(
      {
        error: "Error insertando clientes.",
        debug: insertError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    created: toInsert.length,
    skipped,
    invalid: invalid.length,
    invalidRows: invalid,
  });
}
