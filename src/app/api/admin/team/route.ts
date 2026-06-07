import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_ADMINS_PER_BARBERSHOP = 5;

/**
 * /api/admin/team?barbershopSlug=<slug>
 *
 *   GET → { admins: [{user_id, email, is_owner, created_at}], canInvite, max }
 *   POST body { barbershopSlug, email } → { ok, admin }
 *        Invita por email. Si el user ya existe en auth.users, lo agrega.
 *        Si no existe, devuelve error pidiendo que se registre primero.
 *   DELETE body { barbershopSlug, userId } → { ok }
 *        Solo el owner puede remover. No se puede remover al owner.
 */

async function getAuthUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const { data } = await getSupabaseAdminClient().auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  return data.user?.id ?? null;
}

async function getMyRow(userId: string, barbershopSlug: string) {
  const { data } = await getSupabaseAdminClient()
    .from("barbershop_admins")
    .select("user_id, is_owner")
    .eq("user_id", userId)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();
  return data as { user_id: string; is_owner: boolean } | null;
}

async function listAdminsWithEmails(barbershopSlug: string) {
  const supabase = getSupabaseAdminClient();
  const { data: rows } = await supabase
    .from("barbershop_admins")
    .select("user_id, is_owner, created_at")
    .eq("barbershop_slug", barbershopSlug)
    .order("created_at", { ascending: true });

  if (!rows) return [];

  // Buscar emails desde auth.admin.listUsers (no podemos joinear directo)
  const userIds = (rows as Array<{ user_id: string }>).map((r) => r.user_id);
  const { data: usersData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200, // suficiente para el MVP, ningún barbero tendrá 200 admins
  });

  const emailByUserId = new Map<string, string>();
  for (const u of usersData?.users ?? []) {
    if (userIds.includes(u.id)) {
      emailByUserId.set(u.id, u.email ?? "(sin email)");
    }
  }

  return (rows as Array<{
    user_id: string;
    is_owner: boolean;
    created_at: string;
  }>).map((r) => ({
    user_id: r.user_id,
    email: emailByUserId.get(r.user_id) ?? "(usuario desconocido)",
    is_owner: r.is_owner,
    created_at: r.created_at,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barbershopSlug = searchParams.get("barbershopSlug") ?? "";
  if (!barbershopSlug) {
    return NextResponse.json({ error: "Falta barbershopSlug." }, { status: 400 });
  }
  const userId = await getAuthUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const myRow = await getMyRow(userId, barbershopSlug);
  if (!myRow) {
    return NextResponse.json(
      { error: "No sos admin de esta barbería." },
      { status: 403 },
    );
  }

  try {
    const admins = await listAdminsWithEmails(barbershopSlug);
    return NextResponse.json({
      admins,
      canInvite: myRow.is_owner && admins.length < MAX_ADMINS_PER_BARBERSHOP,
      max: MAX_ADMINS_PER_BARBERSHOP,
      iAmOwner: myRow.is_owner,
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "admin/team", method: "GET" } });
    return NextResponse.json({ error: "Error cargando equipo." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!barbershopSlug || !email) {
    return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const userId = await getAuthUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const myRow = await getMyRow(userId, barbershopSlug);
  if (!myRow || !myRow.is_owner) {
    return NextResponse.json(
      { error: "Solo el owner puede invitar nuevos admins." },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdminClient();

  // Buscar el user por email
  const { data: usersData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const targetUser = (usersData?.users ?? []).find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );

  if (!targetUser) {
    return NextResponse.json(
      {
        error:
          "Ese email no tiene cuenta en TijerApp. Que primero se registre en /login (tab Registrarme) y después invitalo.",
      },
      { status: 404 },
    );
  }

  // Verificar límite
  const existing = await listAdminsWithEmails(barbershopSlug);
  if (existing.length >= MAX_ADMINS_PER_BARBERSHOP) {
    return NextResponse.json(
      { error: `Límite de ${MAX_ADMINS_PER_BARBERSHOP} admins por barbería alcanzado.` },
      { status: 400 },
    );
  }

  // Ya es admin?
  if (existing.some((a) => a.user_id === targetUser.id)) {
    return NextResponse.json(
      { error: "Ese usuario ya es admin de esta barbería." },
      { status: 409 },
    );
  }

  const { error: insertError } = await supabase
    .from("barbershop_admins")
    .insert([
      {
        user_id: targetUser.id,
        barbershop_slug: barbershopSlug,
        is_owner: false,
        invited_by: userId,
      },
    ] as never);

  if (insertError) {
    Sentry.captureException(insertError, { tags: { route: "admin/team", step: "insert" } });
    return NextResponse.json(
      { error: "No pudimos agregar el admin." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    admin: {
      user_id: targetUser.id,
      email: targetUser.email ?? email,
      is_owner: false,
      created_at: new Date().toISOString(),
    },
  });
}

export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  const targetUserId =
    typeof body.userId === "string" ? body.userId : "";

  if (!barbershopSlug || !targetUserId) {
    return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  }

  const userId = await getAuthUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const myRow = await getMyRow(userId, barbershopSlug);
  if (!myRow || !myRow.is_owner) {
    return NextResponse.json(
      { error: "Solo el owner puede remover admins." },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data: target } = await supabase
    .from("barbershop_admins")
    .select("user_id, is_owner")
    .eq("user_id", targetUserId)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();

  if (!target) {
    return NextResponse.json(
      { error: "Ese admin no existe en tu barbería." },
      { status: 404 },
    );
  }
  if ((target as { is_owner: boolean }).is_owner) {
    return NextResponse.json(
      { error: "No se puede remover al owner. Transferí ownership primero." },
      { status: 400 },
    );
  }

  const { error: deleteError } = await supabase
    .from("barbershop_admins")
    .delete()
    .eq("user_id", targetUserId)
    .eq("barbershop_slug", barbershopSlug);

  if (deleteError) {
    return NextResponse.json(
      { error: "No pudimos remover el admin." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
