import { NextResponse } from "next/server";
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolveEmailFrom } from "@/lib/email/from";
import { sendClientPushForAppointment } from "@/lib/push/sendClientPush";

export const runtime = "nodejs";

/**
 * GET /api/cron/deposits
 *
 * 1) AUTO-CANCELA las reservas cuya seña sigue pendiente y ya venció el plazo:
 *    el turno pasa a `cancelled` + `deposit_status='expired'`, liberando el
 *    horario. Registra cada caso en `payment_events`.
 *
 * 2) RECORDATORIO DE PAGO (US3): a las reservas con seña pendiente que pasaron
 *    la mitad de su plazo y todavía no se recordaron, les manda un aviso por
 *    push (si el cliente lo activó) y por email (si dejó email), con el link
 *    para pagar. Una sola vez por turno (reminder_log kind='deposit_reminder').
 *
 * Autenticado con Bearer CRON_SECRET. Scheduleado por GitHub Actions.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured." },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // ── 1. Expirar señas vencidas ──────────────────────────────────────────
  const { data: pending, error } = await supabase
    .from("appointments")
    .select("id")
    .eq("deposit_status", "pending")
    .eq("status", "pending")
    .lt("deposit_expires_at", nowIso);

  if (error) {
    Sentry.captureException(error, { tags: { route: "cron/deposits" } });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (pending ?? []).map((row) => (row as { id: string }).id);
  let expired = 0;

  for (const id of ids) {
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        deposit_status: "expired",
        cancellation_reason: "Seña no pagada a tiempo",
      })
      .eq("id", id)
      // Guard de concurrencia: solo si sigue pendiente.
      .eq("deposit_status", "pending");

    if (updateError) {
      Sentry.captureException(updateError, {
        tags: { route: "cron/deposits", step: "expire" },
      });
      continue;
    }

    await supabase.from("payment_events").insert({
      appointment_id: id,
      event_type: "auto_expired",
    });
    expired += 1;
  }

  // ── 2. Recordatorio de pago (US3) ──────────────────────────────────────
  const reminded = await sendDepositReminders(supabase, now);

  return NextResponse.json({ ok: true, expired, reminded });
}

type DepositReminderRow = {
  id: string;
  confirmation_token: string | null;
  created_at: string;
  deposit_expires_at: string;
  deposit_amount: number | null;
  barbershop_slug: string;
  customer_name: string;
  customer_email: string | null;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
};

async function sendDepositReminders(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  now: Date,
): Promise<number> {
  const nowIso = now.toISOString();
  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;
  const fromAddress = resolveEmailFrom();
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://tijerapp.com"
  ).replace(/\/$/, "");

  // Señas pendientes que TODAVÍA no vencieron.
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, confirmation_token, created_at, deposit_expires_at, deposit_amount, barbershop_slug, customer_name, customer_email, service_name, appointment_date, appointment_time",
    )
    .eq("deposit_status", "pending")
    .eq("status", "pending")
    .gt("deposit_expires_at", nowIso);

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "cron/deposits", step: "reminderQuery" },
    });
    return 0;
  }

  const rows = (data ?? []) as DepositReminderRow[];
  if (rows.length === 0) return 0;

  // Elegibles: pasó la mitad del plazo (midpoint entre created y expires).
  const eligible = rows.filter((r) => {
    if (!r.created_at || !r.deposit_expires_at) return false;
    const created = new Date(r.created_at).getTime();
    const expires = new Date(r.deposit_expires_at).getTime();
    if (!Number.isFinite(created) || !Number.isFinite(expires)) return false;
    const midpoint = created + (expires - created) / 2;
    return now.getTime() >= midpoint;
  });
  if (eligible.length === 0) return 0;

  // Ya recordados (cualquier canal) → los salteamos.
  const eligibleIds = eligible.map((r) => r.id);
  const { data: logs } = await supabase
    .from("reminder_log")
    .select("appointment_id")
    .eq("kind", "deposit_reminder")
    .in("appointment_id", eligibleIds);
  const alreadyReminded = new Set(
    (logs ?? []).map((l) => (l as { appointment_id: string }).appointment_id),
  );

  const toRemind = eligible.filter((r) => !alreadyReminded.has(r.id));
  if (toRemind.length === 0) return 0;

  // Nombres de barbería (batch) para el mensaje.
  const slugs = [...new Set(toRemind.map((r) => r.barbershop_slug))];
  const { data: shops } = await supabase
    .from("barbershops")
    .select("slug, name")
    .in("slug", slugs);
  const shopName = new Map(
    (shops ?? []).map((s) => [
      (s as { slug: string }).slug,
      (s as { name: string }).name,
    ]),
  );

  let remindedCount = 0;

  for (const r of toRemind) {
    const name = shopName.get(r.barbershop_slug) ?? "tu barbería";
    const time = r.appointment_time.slice(0, 5);
    const payUrl = r.confirmation_token
      ? `${siteUrl}/r/${r.confirmation_token}`
      : siteUrl;
    let anySent = false;

    // Push
    try {
      const pushResult = await sendClientPushForAppointment(r.id, {
        title: `Falta pagar tu seña · ${name}`,
        body: `Pagá la seña de tu turno de las ${time}hs para confirmarlo, o se libera.`,
        url: r.confirmation_token ? `/r/${r.confirmation_token}` : "/",
      });
      if (pushResult.sent > 0) {
        await supabase.from("reminder_log").insert({
          appointment_id: r.id,
          kind: "deposit_reminder",
          channel: "push",
          status: "sent",
        });
        anySent = true;
      }
    } catch (pushError) {
      Sentry.captureException(pushError, {
        tags: { route: "cron/deposits", step: "reminderPush" },
      });
    }

    // Email
    if (resend && r.customer_email) {
      try {
        const result = await resend.emails.send({
          from: fromAddress,
          to: [r.customer_email],
          subject: `Falta pagar tu seña en ${name}`,
          html: buildDepositReminderHtml({
            barbershopName: name,
            customerName: r.customer_name,
            serviceName: r.service_name,
            time,
            payUrl,
          }),
        });
        await supabase.from("reminder_log").insert({
          appointment_id: r.id,
          kind: "deposit_reminder",
          channel: "email",
          status: result.error ? "failed" : "sent",
          error_message: result.error ? result.error.message : null,
        });
        if (!result.error) anySent = true;
      } catch (sendError) {
        Sentry.captureException(sendError, {
          tags: { route: "cron/deposits", step: "reminderEmail" },
        });
      }
    }

    if (anySent) remindedCount += 1;
  }

  return remindedCount;
}

function buildDepositReminderHtml(params: {
  barbershopName: string;
  customerName: string;
  serviceName: string;
  time: string;
  payUrl: string;
}): string {
  const firstName = params.customerName.split(/\s+/)[0] || params.customerName;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:24px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0f0f0f;border:1px solid #1f1f1f;border-radius:12px;">
        <tr><td style="padding:24px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#c9a23e;font-weight:700;">Falta pagar tu seña</p>
          <h1 style="margin:8px 0 0;font-size:20px;color:#fff;">Hola ${firstName}!</h1>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#e6e6e6;">
            Tu turno de <strong>${params.serviceName}</strong> a las <strong>${params.time}hs</strong> en
            <strong>${params.barbershopName}</strong> todavía no está confirmado porque falta pagar la seña.
          </p>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#e6e6e6;">
            Si no la pagás pronto, el horario se libera para otra persona.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
            <tr><td style="border-radius:8px;background:#c9a23e;">
              <a href="${params.payUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#000;text-decoration:none;">Pagar la seña</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:#666;">Pago seguro vía MercadoPago.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
