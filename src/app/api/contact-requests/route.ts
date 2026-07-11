import { NextResponse } from "next/server";
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolveEmailFrom } from "@/lib/email/from";

export const runtime = "nodejs";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  source?: unknown;
};

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json(
      { error: "Body inválido." },
      { status: 400 },
    );
  }

  const name = asTrimmedString(payload.name);
  const email = asTrimmedString(payload.email);
  const phone = asTrimmedString(payload.phone);
  const message = asTrimmedString(payload.message);
  const source = asTrimmedString(payload.source) || "home";

  if (!name) {
    return NextResponse.json(
      { error: "El nombre es obligatorio." },
      { status: 400 },
    );
  }
  if (!message) {
    return NextResponse.json(
      { error: "El mensaje es obligatorio." },
      { status: 400 },
    );
  }
  if (!email && !phone) {
    return NextResponse.json(
      { error: "Necesitamos un email o un teléfono para responderte." },
      { status: 400 },
    );
  }

  // Service role key: bypassa RLS. El endpoint es server-side y solo
  // recibe payloads validados arriba. La policy "anon insert with check
  // true" debería funcionar pero quedó bloqueando en producción —
  // usamos admin client por consistencia con el resto de los endpoints.
  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch (configError) {
    Sentry.captureException(configError);
    return NextResponse.json(
      { error: "Servidor mal configurado." },
      { status: 500 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("contact_requests")
    .insert({
      name,
      email: email || null,
      phone: phone || null,
      message,
      source,
    })
    .select("id, created_at")
    .single();

  if (insertError || !inserted) {
    Sentry.captureException(insertError ?? new Error("contact insert failed"));
    console.error("[contact-requests] insert error", insertError);
    return NextResponse.json(
      { error: "No pudimos guardar tu mensaje. Probá de nuevo." },
      { status: 500 },
    );
  }

  // Email no es bloqueante: si falla, igual devolvemos OK al cliente.
  // El mensaje ya quedó persistido en la DB.
  const resendApiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  const fromAddress = resolveEmailFrom();

  if (resendApiKey && ownerEmail) {
    try {
      const resend = new Resend(resendApiKey);
      const subject = `TijerApp · Nuevo mensaje de ${name}`;
      const replyTo = email || undefined;

      const html = buildNotificationHtml({
        name,
        email,
        phone,
        message,
        source,
        receivedAt: inserted.created_at,
      });

      const result = await resend.emails.send({
        from: fromAddress,
        to: [ownerEmail],
        subject,
        html,
        replyTo,
      });

      if (result.error) {
        Sentry.captureException(result.error);
        console.error("[contact-requests] resend error", result.error);
      }
    } catch (emailError) {
      Sentry.captureException(emailError);
      console.error("[contact-requests] resend exception", emailError);
      // No fallamos la request del cliente, ya guardamos en DB.
    }
  }

  return NextResponse.json(
    { ok: true, id: inserted.id },
    { status: 201 },
  );
}

function buildNotificationHtml(params: {
  name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  receivedAt: string;
}): string {
  const fmtDate = (() => {
    try {
      return new Date(params.receivedAt).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return params.receivedAt;
    }
  })();

  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safePhone = escapeHtml(params.phone);
  const safeMessage = escapeHtml(params.message).replace(/\n/g, "<br>");
  const safeSource = escapeHtml(params.source);

  const phoneDigits = params.phone.replace(/\D+/g, "");
  const phoneLink = phoneDigits
    ? `<a href="https://wa.me/${phoneDigits}" style="color:#c9a23e;text-decoration:none;">${safePhone}</a>`
    : "—";
  const emailLink = params.email
    ? `<a href="mailto:${safeEmail}" style="color:#c9a23e;text-decoration:none;">${safeEmail}</a>`
    : "—";

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:32px 16px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#0f0f0f;border:1px solid #1f1f1f;border-radius:12px;">
          <tr>
            <td style="padding:24px 24px 12px;border-bottom:1px solid #1f1f1f;">
              <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#c9a23e;">
                TijerApp
              </p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;">
                Nuevo mensaje de contacto
              </h1>
              <p style="margin:6px 0 0;font-size:12px;color:#9a9a9a;">
                Recibido ${fmtDate} desde ${safeSource}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#9a9a9a;letter-spacing:0.16em;">De</p>
              <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#fff;">${safeName}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="50%" style="padding-right:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#9a9a9a;letter-spacing:0.16em;">Email</p>
                    <p style="margin:0;font-size:13px;font-family:monospace;color:#fff;">${emailLink}</p>
                  </td>
                  <td width="50%" style="padding-left:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#9a9a9a;letter-spacing:0.16em;">Teléfono</p>
                    <p style="margin:0;font-size:13px;font-family:monospace;color:#fff;">${phoneLink}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#9a9a9a;letter-spacing:0.16em;">Mensaje</p>
              <div style="margin:0;padding:16px;background:#1a1a1a;border-radius:8px;font-size:14px;line-height:1.6;color:#e6e6e6;">
                ${safeMessage}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #1f1f1f;text-align:center;">
              <p style="margin:0;font-size:11px;color:#666;">
                Andá a <a href="${(process.env.NEXT_PUBLIC_SITE_URL || "https://tijerapp.com").replace(/\/$/, "")}/owner/mensajes" style="color:#c9a23e;text-decoration:none;">/owner/mensajes</a> para marcarlo como atendido.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
