import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_ADMINS_PER_BARBERSHOP = 5;

/**
 * Genera un password temporal random de 14 chars con mix letras+números+símbolo.
 * El user va a recibirlo por email y debería cambiarlo después de loguearse.
 * NO usamos Math.random crypto-grade pero alcanza para password inicial que
 * el usuario va a rotar.
 */
function generateTemporaryPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%&*";
  let pw = "";
  for (let i = 0; i < 13; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  pw += symbols[Math.floor(Math.random() * symbols.length)];
  return pw;
}

/**
 * Envía el email de invitación al nuevo admin. Dos templates:
 *  - createdNewAccount=true → incluye email + password temporal + URL de login
 *  - createdNewAccount=false → manda magic link de reset por si el user no
 *    recuerda su password
 * Si Resend no está configurado, no rompe — solo loguea.
 */
async function sendInvitationEmail(input: {
  toEmail: string;
  barbershopSlug: string;
  createdNewAccount: boolean;
  temporaryPassword: string | null;
  /** Base URL derivado del request actual (más robusto que env var). */
  siteUrl: string;
  /** Magic link para reset password (solo si user ya existía). */
  resetPasswordLink: string | null;
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[admin/team] RESEND_API_KEY missing — skipping invite email");
    return;
  }

  const loginUrl = `${input.siteUrl.replace(/\/$/, "")}/login?next=${encodeURIComponent(`/${input.barbershopSlug}/admin`)}`;
  const fromAddress =
    process.env.OWNER_NOTIFICATION_FROM ||
    process.env.REMINDER_EMAIL_FROM ||
    "TijerApp <onboarding@resend.dev>";

  const subject = input.createdNewAccount
    ? `Te invitaron a administrar una barbería en TijerApp`
    : `Tenés acceso nuevo a una barbería en TijerApp`;

  const credentialsBlock = input.createdNewAccount
    ? `
    <tr><td style="padding-top:18px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#161616;border-radius:6px;padding:18px;border:1px solid rgba(201,162,62,0.2);">
        <tr><td>
          <p style="margin:0 0 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#c9a23e;">Tus credenciales temporales</p>
          <p style="margin:0;font-size:11px;color:#8a8a8a;">Email</p>
          <p style="margin:4px 0 12px;font-family:monospace;font-size:14px;color:#fff;">${input.toEmail}</p>
          <p style="margin:0;font-size:11px;color:#8a8a8a;">Contraseña temporal</p>
          <p style="margin:4px 0 8px;font-family:monospace;font-size:14px;color:#fff;background:#0a0a0a;padding:8px 10px;border-radius:4px;letter-spacing:0.5px;">${input.temporaryPassword}</p>
          <p style="margin:10px 0 0;font-size:11px;color:#c8c8c8;">Cambiala una vez que entres, en Configuración → Seguridad.</p>
        </td></tr>
      </table>
    </td></tr>`
    : `
    <tr><td style="padding-top:18px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#c8c8c8;">Ya tenés cuenta en TijerApp. Usá tu email y contraseña existentes para entrar.</p>
      ${
        input.resetPasswordLink
          ? `<p style="margin:14px 0 0;font-size:12px;color:#8a8a8a;">¿No la recordás? <a href="${input.resetPasswordLink}" style="color:#c9a23e;text-decoration:underline;">Resetear contraseña</a> (link válido por 1 hora).</p>`
          : ""
      }
    </td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:32px;">
        <tr><td style="padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#c9a23e;">TijerApp</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;line-height:1.25;">
            ${input.createdNewAccount ? "Te invitaron a administrar una barbería" : "Tenés acceso nuevo"}
          </h1>
        </td></tr>
        <tr><td style="padding-top:18px;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#e6e6e6;">
            Te dieron acceso de admin a la barbería <strong style="color:#c9a23e;">${input.barbershopSlug}</strong> en TijerApp, el SaaS de turnos para barberías.
          </p>
        </td></tr>
        ${credentialsBlock}
        <tr><td style="padding-top:24px;text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;background:#c9a23e;color:#000;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;font-size:13px;padding:14px 28px;border-radius:6px;">
            Acceder al panel
          </a>
        </td></tr>
        <tr><td style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:#666;text-align:center;">
            Si no esperabas este email, podés ignorarlo. Solo el owner de la barbería puede invitar admins.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: fromAddress,
      to: input.toEmail,
      subject,
      html,
    });
  } catch (err) {
    // No queremos romper el flow de invitación si Resend falla — el user
    // queda agregado igual y el owner puede reenviar manualmente. Solo log.
    console.error("[admin/team] Failed to send invite email:", err);
    Sentry.captureException(err, {
      tags: { route: "admin/team", step: "sendInvitationEmail" },
    });
  }
}

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

  // Verificar límite de admins ANTES de cualquier operación costosa
  const existing = await listAdminsWithEmails(barbershopSlug);
  if (existing.length >= MAX_ADMINS_PER_BARBERSHOP) {
    return NextResponse.json(
      { error: `Límite de ${MAX_ADMINS_PER_BARBERSHOP} admins por barbería alcanzado.` },
      { status: 400 },
    );
  }

  // Buscar el user por email — si existe, lo agregamos directo; si no,
  // lo creamos con password temporal y mandamos email.
  const { data: usersData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  let targetUser = (usersData?.users ?? []).find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );

  let createdNewAccount = false;
  let temporaryPassword: string | null = null;

  if (!targetUser) {
    // El email no tiene cuenta → la creamos automáticamente con password
    // temporal random. Esto evita que el invitado tenga que auto-registrarse
    // (UX más simple + seguridad: cuentas solo se crean si owner aprueba).
    temporaryPassword = generateTemporaryPassword();

    const { data: newUserData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true, // auto-confirmamos el email — no requiere verificación
        user_metadata: {
          invited_by_user_id: userId,
          invited_to_barbershop: barbershopSlug,
        },
      });

    if (createError || !newUserData.user) {
      Sentry.captureException(createError ?? new Error("createUser returned no user"), {
        tags: { route: "admin/team", step: "createUser" },
      });
      return NextResponse.json(
        { error: "No pudimos crear la cuenta para ese email." },
        { status: 500 },
      );
    }
    targetUser = newUserData.user;
    createdNewAccount = true;
  } else {
    // El user ya existe — verificar que no sea YA admin de esta barbería
    if (existing.some((a) => a.user_id === targetUser!.id)) {
      return NextResponse.json(
        { error: "Ese usuario ya es admin de esta barbería." },
        { status: 409 },
      );
    }
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

  // Derivar el siteUrl desde el host del request (más confiable que env var
  // que puede estar apuntando al deploy viejo o mal configurado en Vercel).
  // Fallback al env si por alguna razón no hay host header.
  const requestUrl = new URL(request.url);
  const siteUrl =
    `${requestUrl.protocol}//${requestUrl.host}` ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://tijerapp.vercel.app";

  // Si el user YA existía y posiblemente no recuerda su password, le
  // generamos un magic link de reset password para incluir en el email.
  // El link expira en 1h (default de Supabase).
  let resetPasswordLink: string | null = null;
  if (!createdNewAccount) {
    try {
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${siteUrl}/login?next=${encodeURIComponent(`/${barbershopSlug}/admin`)}`,
        },
      });
      resetPasswordLink = linkData?.properties?.action_link ?? null;
    } catch (linkError) {
      console.warn("[admin/team] Failed to generate reset link:", linkError);
      // No bloqueamos — el email se manda sin el link
    }
  }

  await sendInvitationEmail({
    toEmail: email,
    barbershopSlug,
    createdNewAccount,
    temporaryPassword,
    siteUrl,
    resetPasswordLink,
  });

  return NextResponse.json({
    ok: true,
    createdNewAccount,
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
