import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolveEmailFrom } from "@/lib/email/from";
import { assertPlanActive } from "@/lib/api-plan-guard";

export const runtime = "nodejs";

/**
 * POST /api/admin/appointments/notify-rescheduled
 *
 * Envía un email al cliente avisándole que su turno fue movido. Llamado
 * automáticamente desde el frontend después de un drag&drop exitoso, si
 * el cliente tiene email registrado.
 *
 * Body:
 *   {
 *     appointmentId: string,
 *     barbershopSlug: string,
 *     oldDate: string (YYYY-MM-DD),
 *     oldTime: string (HH:MM)
 *   }
 *
 * Headers:
 *   Authorization: Bearer <supabase access token del admin>
 *
 * Returns:
 *   200 { sent: true } — email enviado OK
 *   200 { sent: false, skipped: "..." } — no se envió (no email, no Resend, etc.)
 *   401/403 — auth
 *   404 — appointment no encontrado
 *   500 — error inesperado
 *
 * Nota: aunque el email no se envíe (skipped), devolvemos 200 para que
 * el frontend no muestre error al user. El admin igual puede usar el
 * botón WhatsApp del modal como fallback.
 */

async function assertAdminOfBarbershop(
  authHeader: string | null,
  barbershopSlug: string,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }
> {
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
  return { ok: true, userId: userResult.user.id };
}

function formatLongDate(ymd: string): string {
  // "2026-06-07" → "Domingo 7 de junio"
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(date)
    .replace(/^./, (c) => c.toUpperCase());
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const appointmentId =
    typeof payload.appointmentId === "string" ? payload.appointmentId : "";
  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  const oldDate =
    typeof payload.oldDate === "string" ? payload.oldDate : "";
  const oldTime =
    typeof payload.oldTime === "string" ? payload.oldTime : "";

  if (!appointmentId || !barbershopSlug || !oldDate || !oldTime) {
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

  const supabaseAdmin = getSupabaseAdminClient();

  // Cargar el appointment + datos de la barbería
  const [appointmentRes, barbershopRes] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select(
        "id, barbershop_slug, customer_name, customer_email, service_name, appointment_date, appointment_time, barber_name",
      )
      .eq("id", appointmentId)
      .maybeSingle(),
    supabaseAdmin
      .from("barbershops")
      .select("slug, name, whatsapp, logo_url")
      .eq("slug", barbershopSlug)
      .maybeSingle(),
  ]);

  if (appointmentRes.error) {
    Sentry.captureException(appointmentRes.error);
    return NextResponse.json(
      { error: "No pudimos leer el turno." },
      { status: 500 },
    );
  }
  const appointment = appointmentRes.data;
  if (!appointment) {
    return NextResponse.json(
      { error: "Turno no encontrado." },
      { status: 404 },
    );
  }
  if (appointment.barbershop_slug !== barbershopSlug) {
    return NextResponse.json(
      { error: "El turno no pertenece a esta barbería." },
      { status: 403 },
    );
  }

  const barbershop = barbershopRes.data;
  if (!barbershop) {
    return NextResponse.json(
      { error: "Barbería no encontrada." },
      { status: 404 },
    );
  }

  // Sin email del cliente: no podemos enviar, devolvemos skipped OK
  if (!appointment.customer_email) {
    return NextResponse.json({ sent: false, skipped: "no email" });
  }

  // Sin Resend configurado: idem
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({
      sent: false,
      skipped: "RESEND_API_KEY missing",
    });
  }

  const resend = new Resend(resendApiKey);
  const fromAddress = resolveEmailFrom();

  const newTimeShort = appointment.appointment_time.slice(0, 5);
  const newDateLabel = formatLongDate(appointment.appointment_date);
  const oldDateLabel = formatLongDate(oldDate);
  const dateChanged = oldDate !== appointment.appointment_date;

  const subject = dateChanged
    ? `Tu turno fue reagendado · ${barbershop.name}`
    : `Tu turno se movió a las ${newTimeShort} · ${barbershop.name}`;

  const previewText = dateChanged
    ? `Nuevo horario: ${newDateLabel} a las ${newTimeShort}.`
    : `Pasó de las ${oldTime} a las ${newTimeShort}.`;

  // HTML simple, paleta TijerApp (negro + gold). Inline styles para máxima
  // compatibilidad cross-email-client (Gmail, Outlook, Apple Mail).
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#ffffff;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000000;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:32px;">

          <!-- Brand header — logo del barbero si existe + nombre -->
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              ${
                (barbershop as { logo_url?: string | null }).logo_url
                  ? `<img src="${(barbershop as { logo_url: string }).logo_url}" alt="${barbershop.name}" width="48" height="48" style="display:inline-block;width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #c9a23e;vertical-align:middle;margin-right:12px;" />
                     <span style="font-size:13px;font-weight:700;color:#ffffff;vertical-align:middle;">${barbershop.name}</span>`
                  : `<p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#c9a23e;">${barbershop.name}</p>`
              }
              <h1 style="margin:14px 0 0 0;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">
                ${dateChanged ? "Tu turno fue reagendado" : "Tu turno cambió de hora"}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#c8c8c8;">
                Hola <strong style="color:#ffffff;">${appointment.customer_name.split(" ")[0]}</strong>, te avisamos que tuvimos que mover tu turno de
                <strong style="color:#ffffff;">${appointment.service_name}</strong>.
              </p>

              <!-- Old vs New -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                <tr>
                  <td style="background-color:#161616;border-left:3px solid #ef4444;padding:12px 16px;border-radius:4px;">
                    <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#8a8a8a;">Antes</p>
                    <p style="margin:4px 0 0 0;font-size:16px;font-weight:600;color:#c8c8c8;text-decoration:line-through;">
                      ${oldDateLabel} · ${oldTime}
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:rgba(201,162,62,0.08);border-left:3px solid #c9a23e;padding:16px;border-radius:4px;">
                    <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#c9a23e;">Nuevo horario</p>
                    <p style="margin:8px 0 0 0;font-size:20px;font-weight:900;color:#ffffff;line-height:1.3;">
                      ${newDateLabel}
                    </p>
                    <p style="margin:4px 0 0 0;font-size:18px;font-weight:700;color:#c9a23e;">
                      ${newTimeShort}${appointment.barber_name ? ` · con ${appointment.barber_name}` : ""}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#8a8a8a;">
                Si no te queda bien este horario, respondé a este mail o escribinos por WhatsApp y lo reagendamos sin problema.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#5a5a5a;">
                Este mail se generó automáticamente desde TijerApp.<br>
                ${barbershop.name}${barbershop.whatsapp ? ` · WhatsApp: ${barbershop.whatsapp}` : ""}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: appointment.customer_email,
      subject,
      html,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: { route: "appointments/notify-rescheduled" },
        extra: { appointmentId },
      });
      // Fail soft: no rompemos el flow del frontend
      return NextResponse.json({
        sent: false,
        skipped: "resend error",
        error: error.message,
      });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "appointments/notify-rescheduled" },
    });
    return NextResponse.json({ sent: false, skipped: "exception" });
  }
}
