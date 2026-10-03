import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolveEmailFrom } from "@/lib/email/from";
import { assertPlanActive, assertPlanFeature } from "@/lib/api-plan-guard";
import { resolveBarbershopAdminAccess } from "@/lib/server/barbershop-admin-access";

export const runtime = "nodejs";

const MAX_ADMINS_PER_BARBERSHOP = 5;

/**
 * Genera un password temporal random de 14 chars con mix letras+números+símbolo.
 * Solo para cuentas NUEVAS: el user lo recibe por email y lo cambia al entrar.
 * Sale de `crypto`, no de `Math.random`: es una credencial, aunque dure poco.
 */
function generateTemporaryPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@#$%&*";
  let pw = "";
  for (let i = 0; i < 13; i++) {
    pw += chars[randomInt(chars.length)];
  }
  pw += symbols[randomInt(symbols.length)];
  return pw;
}

const USUARIOS_POR_PAGINA = 200;
/** Tope de páginas a recorrer: 50 × 200 = 10.000 cuentas. */
const MAX_PAGINAS_DE_USUARIOS = 50;

type ResultadoBusqueda =
  | { ok: true; user: { id: string; email?: string } | null }
  | { ok: false };

/**
 * Busca una cuenta por email recorriendo TODAS las páginas de Auth.
 *
 * Antes se miraba solo la primera página de 200: con más cuentas que eso, un
 * email existente "no aparecía", se intentaba crear de nuevo y fallaba. Y si la
 * consulta falla se devuelve `ok: false` en vez de "no existe": confundir un
 * error con una cuenta nueva es lo que no puede pasar acá.
 */
async function buscarUsuarioPorEmail(email: string): Promise<ResultadoBusqueda> {
  const supabase = getSupabaseAdminClient();
  for (let page = 1; page <= MAX_PAGINAS_DE_USUARIOS; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USUARIOS_POR_PAGINA,
    });
    if (error) return { ok: false };
    const users = data?.users ?? [];
    const encontrado = users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (encontrado) return { ok: true, user: encontrado };
    if (users.length < USUARIOS_POR_PAGINA) return { ok: true, user: null };
  }
  return { ok: false };
}

/**
 * Envía el email de invitación al nuevo admin.
 *
 * - Cuenta NUEVA: email + contraseña temporal, y el link para elegir la propia.
 * - Cuenta que YA EXISTÍA: solo el aviso de que tiene acceso. Entra con la
 *   contraseña que ya usa; no se le toca ni se le manda ninguna.
 *
 * Devuelve si el mail salió. No rompe la invitación si falla —el acceso ya
 * quedó dado—, pero el dueño tiene que saberlo para avisarle por su cuenta.
 */
async function sendInvitationEmail(input: {
  toEmail: string;
  barbershopSlug: string;
  createdNewAccount: boolean;
  temporaryPassword: string | null;
  siteUrl: string;
  resetPasswordLink: string | null;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[admin/team] RESEND_API_KEY missing — skipping invite email");
    return false;
  }

  const loginUrl = `${input.siteUrl.replace(/\/$/, "")}/login?next=${encodeURIComponent(`/${input.barbershopSlug}/admin`)}`;
  const fromAddress = resolveEmailFrom();

  const subject = input.createdNewAccount
    ? `Te invitaron a administrar una barbería en TijerApp`
    : `Te dieron acceso a una barbería en TijerApp`;

  // Bloque de credenciales: SOLO si la cuenta se acaba de crear. A quien ya
  // tenía cuenta no se le cambia la contraseña, así que no hay nada que mandar.
  const credentialsBlock = !input.temporaryPassword
    ? `
    <tr><td style="padding-top:18px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#c8c8c8;">
        Entrá con el email <strong style="color:#fff;">${input.toEmail}</strong> y la contraseña que ya usás en TijerApp. No te la cambiamos.
      </p>
    </td></tr>`
    : `
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
    </td></tr>
    ${
      input.resetPasswordLink
        ? `<tr><td style="padding-top:14px;">
            <p style="margin:0;font-size:11px;color:#8a8a8a;line-height:1.6;">¿Preferís setear tu propia contraseña directo? <a href="${input.resetPasswordLink}" style="color:#c9a23e;text-decoration:underline;">Hacé clic acá</a> (válido 1 hora).</p>
          </td></tr>`
        : ""
    }`;

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:32px;">
        <tr><td style="padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#c9a23e;">TijerApp</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;line-height:1.25;">
            ${input.createdNewAccount ? "Te invitaron a administrar una barbería" : "Te dieron acceso a una barbería"}
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
    // Resend NO tira excepción cuando rechaza un mail: devuelve `error`. Sin
    // mirarlo, una invitación que nunca salió se informaba como enviada.
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: input.toEmail,
      subject,
      html,
    });
    if (error) {
      console.error("[admin/team] Resend rejected invite email:", error);
      Sentry.captureException(new Error(`Resend: ${error.message}`), {
        tags: { route: "admin/team", step: "sendInvitationEmail" },
      });
      return false;
    }
    return true;
  } catch (err) {
    // No queremos romper el flow de invitación si Resend falla — el user
    // queda agregado igual. Se le avisa al dueño que el mail no salió.
    console.error("[admin/team] Failed to send invite email:", err);
    Sentry.captureException(err, {
      tags: { route: "admin/team", step: "sendInvitationEmail" },
    });
    return false;
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

/**
 * Quién soy y si cuento como owner de esta barbería. La decisión es del helper
 * compartido (el owner de la plataforma cuenta como owner de la barbería); acá
 * solo se traducen los rechazos a los mensajes que esta ruta ya devolvía:
 *
 *  - cualquier 401 → "No autorizado." (esta ruta nunca distinguió entre "sin
 *    token" y "token vencido");
 *  - no ser admin, o serlo sin ser owner cuando hace falta → 403 con el mensaje
 *    de cada método.
 *
 * El 503 ("no pudimos verificar tu acceso") pasa tal cual.
 */
async function resolveTeamAccess(
  authHeader: string | null,
  barbershopSlug: string,
  forbiddenMessage: string,
  { requireOwner }: { requireOwner: boolean },
): Promise<
  | { ok: true; userId: string; isOwner: boolean }
  | { ok: false; status: number; error: string }
> {
  const access = await resolveBarbershopAdminAccess(authHeader, barbershopSlug);
  if (!access.ok) {
    if (access.status === 401) {
      return { ok: false, status: 401, error: "No autorizado." };
    }
    if (access.status === 403) {
      return { ok: false, status: 403, error: forbiddenMessage };
    }
    return access;
  }
  if (requireOwner && !access.isBarbershopOwner) {
    return { ok: false, status: 403, error: forbiddenMessage };
  }
  return { ok: true, userId: access.userId, isOwner: access.isBarbershopOwner };
}

async function listAdminsWithEmails(barbershopSlug: string) {
  const supabase = getSupabaseAdminClient();
  const { data: rows } = await supabase
    .from("barbershop_admins")
    .select("user_id, is_owner, created_at")
    .eq("barbershop_slug", barbershopSlug)
    .order("created_at", { ascending: true });

  if (!rows) return [];

  // El email de cada admin, pedido por id (no se puede joinear con Auth). Son
  // 5 como mucho. Antes se listaba la primera página de TODAS las cuentas de
  // la plataforma: pasadas las 200, los admins salían "usuario desconocido".
  const userIds = (rows as Array<{ user_id: string }>).map((r) => r.user_id);
  const emailByUserId = new Map<string, string>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data?.user) emailByUserId.set(id, data.user.email ?? "(sin email)");
    }),
  );

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
  const me = await resolveTeamAccess(
    request.headers.get("authorization"),
    barbershopSlug,
    "No sos admin de esta barbería.",
    { requireOwner: false },
  );
  if (!me.ok) {
    return NextResponse.json({ error: me.error }, { status: me.status });
  }

  try {
    const admins = await listAdminsWithEmails(barbershopSlug);
    return NextResponse.json({
      admins,
      canInvite: me.isOwner && admins.length < MAX_ADMINS_PER_BARBERSHOP,
      max: MAX_ADMINS_PER_BARBERSHOP,
      iAmOwner: me.isOwner,
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

  const me = await resolveTeamAccess(
    request.headers.get("authorization"),
    barbershopSlug,
    "Solo el owner puede invitar nuevos admins.",
    { requireOwner: true },
  );
  if (!me.ok) {
    return NextResponse.json({ error: me.error }, { status: me.status });
  }
  const userId = me.userId;

  const gate = await assertPlanFeature(barbershopSlug, "multi_admin");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
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
  const busqueda = await buscarUsuarioPorEmail(email);
  if (!busqueda.ok) {
    return NextResponse.json(
      { error: "No pudimos verificar ese email. Probá de nuevo en un momento." },
      { status: 503 },
    );
  }
  let targetUser = busqueda.user;

  let createdNewAccount = false;
  // La contraseña temporal es SOLO para una cuenta nueva.
  //
  // Antes, si el email ya tenía cuenta, se le reseteaba la contraseña. Eso
  // dejaba que el dueño de cualquier barbería le cambiara la clave a un
  // usuario de OTRA con solo "invitarlo": al dueño de otra barbería, a un
  // empleado, a quien fuera. Una cuenta que ya existe es de su titular; darle
  // acceso a una barbería más no es motivo para tocarle la credencial.
  let temporaryPassword: string | null = null;

  if (!targetUser) {
    // El email no tiene cuenta → la creamos automáticamente
    temporaryPassword = generateTemporaryPassword();
    const { data: newUserData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true, // auto-confirmamos el email
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
    // No permitir auto-invitarse (el owner mismo): ya tiene acceso.
    if (targetUser!.id === userId) {
      return NextResponse.json(
        { error: "No podés invitarte a vos mismo. Ya tenés acceso como owner." },
        { status: 400 },
      );
    }
    // La cuenta ya existe: se le suma el acceso y NADA más. Entra con la
    // contraseña que ya tiene; si no la recuerda, la recupera él desde
    // /recuperar. (Esto cubre también al owner de la plataforma, que antes
    // necesitaba una excepción propia.)
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
    "https://tijerapp.com";

  // Link de recovery, SOLO para la cuenta recién creada: por si prefiere
  // elegir su propia contraseña en vez de entrar con la temporal. Válido 1h.
  // Para una cuenta que ya existía no se genera: sería mandar un link que
  // entra a la cuenta de otra persona disparado por un tercero.
  let resetPasswordLink: string | null = null;
  if (createdNewAccount) {
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

  const emailSent = await sendInvitationEmail({
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
    // false = el acceso quedó dado pero el mail no salió: el dueño tiene que
    // avisarle por su cuenta (y, si la cuenta es nueva, que use /recuperar).
    emailSent,
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

  const me = await resolveTeamAccess(
    request.headers.get("authorization"),
    barbershopSlug,
    "Solo el owner puede remover admins.",
    { requireOwner: true },
  );
  if (!me.ok) {
    return NextResponse.json({ error: me.error }, { status: me.status });
  }

  // Plan vencido => modo lectura: la barbería se puede leer, no escribir.
  const planGate = await assertPlanActive(barbershopSlug);
  if (!planGate.ok) {
    return NextResponse.json(
      { error: planGate.error },
      { status: planGate.status },
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
