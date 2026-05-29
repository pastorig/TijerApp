import { NextResponse } from "next/server";
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
// Forzamos dynamic para que NUNCA se cachee este endpoint en build/prerender.
export const dynamic = "force-dynamic";

/**
 * Cron de recordatorios automáticos por email.
 *
 * Lógica de timing racional (zona horaria Argentina, GMT-3):
 *
 *  • Recordatorio 24h antes (kind='reminder_24h'):
 *    Se envía si el turno es MAÑANA + la hora actual está entre 17 y 20 hs.
 *    Una vez por turno (reminder_log unique constraint).
 *
 *  • Confirmación (kind='confirmation'):
 *    Se envía 2-4 horas antes del turno, si la hora actual está entre 9 y 21 hs.
 *    Para turnos muy tempranos (antes de las 11 am), se envía la noche anterior
 *    entre 19 y 20 hs.
 *
 * El endpoint se llama via GitHub Actions cada hora.
 * Protegido por CRON_SECRET en el header Authorization.
 *
 * Devuelve siempre 200 con un resumen de qué se hizo, para que
 * GitHub Actions no falle si no hay nada que mandar.
 */

const ARG_TZ = "America/Argentina/Buenos_Aires";

type AppointmentForReminder = {
  id: string;
  barbershop_slug: string;
  customer_name: string;
  customer_email: string | null;
  service_name: string;
  barber_name: string;
  appointment_date: string;
  appointment_time: string;
  confirmation_token: string | null;
  status: string;
};

type BarbershopInfo = {
  slug: string;
  name: string;
};

function getArgParts(): {
  isoUtc: string;
  ymdToday: string;
  ymdTomorrow: string;
  hour: number;
} {
  const now = new Date();
  // Usamos Intl con timezone explícito así no dependemos del timezone del
  // server (Vercel functions corren en UTC pero por las dudas).
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((p) => [p.type, p.value]),
  );
  const ymdToday = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = Number(parts.hour);

  // Mañana en zona Argentina: sumamos 24h al timestamp y volvemos a formatear.
  const tomorrowFormatter = formatter.formatToParts(
    new Date(now.getTime() + 24 * 3_600_000),
  );
  const tomorrowParts = Object.fromEntries(
    tomorrowFormatter.map((p) => [p.type, p.value]),
  );
  const ymdTomorrow = `${tomorrowParts.year}-${tomorrowParts.month}-${tomorrowParts.day}`;

  return {
    isoUtc: now.toISOString(),
    ymdToday,
    ymdTomorrow,
    hour,
  };
}

function getHourFromTime(time: string): number {
  const [h] = time.split(":").map(Number);
  return Number.isFinite(h) ? h : 0;
}

function formatDateForEmail(ymdString: string): string {
  const [y, m, d] = ymdString.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function buildReminderEmailHtml(params: {
  barbershopName: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  date: string;
  time: string;
  kind: "reminder_24h" | "confirmation";
  responderUrl: string | null;
}): string {
  const isUrgent = params.kind === "confirmation";
  const title = isUrgent ? "Te esperamos hoy" : "Recordatorio de turno";
  const intro = isUrgent
    ? `Hola ${params.customerName}, tu turno en ${params.barbershopName} es en pocas horas.`
    : `Hola ${params.customerName}, te recordamos que tenés turno mañana en ${params.barbershopName}.`;

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:32px 16px;">
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#0f0f0f;border:1px solid #1f1f1f;border-radius:12px;">
        <tr><td style="padding:28px 24px 12px;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#c9a23e;">
            ${params.barbershopName}
          </p>
          <h1 style="margin:12px 0 0;font-size:24px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-0.01em;">
            ${title}
          </h1>
        </td></tr>
        <tr><td style="padding:8px 24px 4px;">
          <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#e6e6e6;">
            ${intro}
          </p>
        </td></tr>
        <tr><td style="padding:16px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px;padding:18px;">
            <tr><td style="padding-bottom:12px;">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#9a9a9a;">Cuándo</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#fff;text-transform:capitalize;">
                ${formatDateForEmail(params.date)} · ${params.time}hs
              </p>
            </td></tr>
            <tr><td style="padding-bottom:12px;border-top:1px solid #2a2a2a;padding-top:12px;">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#9a9a9a;">Servicio</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#fff;">${params.serviceName}</p>
            </td></tr>
            <tr><td style="border-top:1px solid #2a2a2a;padding-top:12px;">
              <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#9a9a9a;">Barbero</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#fff;">${params.barberName}</p>
            </td></tr>
          </table>
        </td></tr>
        ${
          params.responderUrl
            ? `<tr><td style="padding:8px 24px 24px;text-align:center;">
                <a href="${params.responderUrl}" style="display:inline-block;background:#c9a23e;color:#000;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;font-size:13px;padding:14px 28px;border-radius:8px;">
                  Confirmar mi turno
                </a>
              </td></tr>`
            : ""
        }
        <tr><td style="padding:16px 24px 28px;text-align:center;border-top:1px solid #1f1f1f;">
          <p style="margin:0;font-size:11px;color:#666;">
            Si no podés asistir, avisanos cuanto antes así liberamos el horario.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(request: Request) {
  // Auth simple via header. El secret se setea como env var en Vercel y en
  // GitHub Actions; sin él, devolvemos 401.
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

  // ?force=true → ignora la ventana horaria (útil para testing).
  const url = new URL(request.url);
  const forceMode = url.searchParams.get("force") === "true";

  const argParts = getArgParts();
  const currentHour = argParts.hour;
  const todayYmd = argParts.ymdToday;
  const tomorrowYmd = argParts.ymdTomorrow;

  const supabase = getSupabaseAdminClient();

  // Trae turnos de hoy y mañana que tienen email.
  const { data: appointments, error: apptError } = await supabase
    .from("appointments")
    .select(
      "id, barbershop_slug, customer_name, customer_email, service_name, barber_name, appointment_date, appointment_time, confirmation_token, status",
    )
    .in("appointment_date", [todayYmd, tomorrowYmd])
    .in("status", ["pending", "confirmed"])
    .not("customer_email", "is", null);

  if (apptError) {
    Sentry.captureException(apptError);
    return NextResponse.json({ error: apptError.message }, { status: 500 });
  }

  // Trae los recordatorios ya enviados para evitar duplicados.
  const appointmentIds = (appointments ?? [])
    .map((a) => a.id)
    .filter((id): id is string => Boolean(id));

  const sentMap = new Map<string, Set<string>>();
  if (appointmentIds.length > 0) {
    const { data: logs } = await supabase
      .from("reminder_log")
      .select("appointment_id, kind")
      .eq("channel", "email")
      .eq("status", "sent")
      .in("appointment_id", appointmentIds);
    for (const log of logs ?? []) {
      const set = sentMap.get(log.appointment_id) ?? new Set<string>();
      set.add(log.kind);
      sentMap.set(log.appointment_id, set);
    }
  }

  // Cache de barbershops para el name.
  const barbershopBySlug = new Map<string, BarbershopInfo>();
  async function getBarbershop(slug: string): Promise<BarbershopInfo> {
    const cached = barbershopBySlug.get(slug);
    if (cached) return cached;
    const { data } = await supabase
      .from("barbershops")
      .select("slug, name")
      .eq("slug", slug)
      .maybeSingle();
    const info: BarbershopInfo = {
      slug,
      name: data?.name ?? slug,
    };
    barbershopBySlug.set(slug, info);
    return info;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress =
    process.env.REMINDER_EMAIL_FROM ||
    process.env.OWNER_NOTIFICATION_FROM ||
    "BarberSync <onboarding@resend.dev>";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://barber-sync-iota.vercel.app";

  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  const decisions: Array<{
    appointmentId: string;
    kind: "reminder_24h" | "confirmation";
    sent: boolean;
    skipped?: string;
    error?: string;
  }> = [];

  for (const appointment of (appointments ?? []) as AppointmentForReminder[]) {
    if (!appointment.id || !appointment.customer_email) continue;
    const apptDate = appointment.appointment_date;
    const apptHour = getHourFromTime(appointment.appointment_time);
    const sentKinds = sentMap.get(appointment.id) ?? new Set<string>();

    // ── Reminder 24h ──────────────────────────────────────────────
    const isTomorrow = apptDate === tomorrowYmd;
    const reminderInWindow =
      forceMode || (currentHour >= 17 && currentHour <= 20);
    if (
      isTomorrow &&
      reminderInWindow &&
      !sentKinds.has("reminder_24h")
    ) {
      const ok = await sendOne(appointment, "reminder_24h");
      decisions.push({ appointmentId: appointment.id, kind: "reminder_24h", ...ok });
      continue;
    }

    // ── Confirmación ──────────────────────────────────────────────
    const isToday = apptDate === todayYmd;
    if (isToday && !sentKinds.has("confirmation")) {
      // Ventana 2-4hs antes del turno, entre 9 y 21 hs.
      const hoursUntil = apptHour - currentHour;
      const confirmationInWindow =
        forceMode ||
        (hoursUntil >= 2 &&
          hoursUntil <= 4 &&
          currentHour >= 9 &&
          currentHour <= 21);
      if (confirmationInWindow) {
        const ok = await sendOne(appointment, "confirmation");
        decisions.push({
          appointmentId: appointment.id,
          kind: "confirmation",
          ...ok,
        });
        continue;
      }
    }
    // Turnos muy temprano (antes de 11am) → confirmación la noche anterior.
    const earlyConfirmInWindow =
      forceMode || (currentHour >= 19 && currentHour <= 20);
    if (
      isTomorrow &&
      apptHour < 11 &&
      earlyConfirmInWindow &&
      !sentKinds.has("confirmation")
    ) {
      const ok = await sendOne(appointment, "confirmation");
      decisions.push({
        appointmentId: appointment.id,
        kind: "confirmation",
        ...ok,
      });
      continue;
    }
  }

  async function sendOne(
    appointment: AppointmentForReminder,
    kind: "reminder_24h" | "confirmation",
  ): Promise<{ sent: boolean; error?: string; skipped?: string }> {
    if (!resend) {
      return { sent: false, skipped: "RESEND_API_KEY missing" };
    }
    if (!appointment.customer_email) {
      return { sent: false, skipped: "no email" };
    }

    const barbershop = await getBarbershop(appointment.barbershop_slug);
    const responderUrl = appointment.confirmation_token
      ? `${siteUrl.replace(/\/$/, "")}/r/${appointment.confirmation_token}/responder`
      : null;

    const subject =
      kind === "confirmation"
        ? `Te esperamos hoy en ${barbershop.name}`
        : `Recordatorio: tenés turno mañana en ${barbershop.name}`;
    const html = buildReminderEmailHtml({
      barbershopName: barbershop.name,
      customerName: appointment.customer_name,
      serviceName: appointment.service_name,
      barberName: appointment.barber_name,
      date: appointment.appointment_date,
      time: appointment.appointment_time.slice(0, 5),
      kind,
      responderUrl,
    });

    try {
      const result = await resend.emails.send({
        from: fromAddress,
        to: [appointment.customer_email],
        subject,
        html,
      });
      if (result.error) {
        await supabase.from("reminder_log").insert({
          appointment_id: appointment.id,
          kind,
          channel: "email",
          status: "failed",
          error_message: result.error.message,
        });
        return { sent: false, error: result.error.message };
      }
      await supabase.from("reminder_log").insert({
        appointment_id: appointment.id,
        kind,
        channel: "email",
        status: "sent",
      });
      return { sent: true };
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "unknown error";
      Sentry.captureException(sendError);
      await supabase.from("reminder_log").insert({
        appointment_id: appointment.id,
        kind,
        channel: "email",
        status: "failed",
        error_message: message,
      });
      return { sent: false, error: message };
    }
  }

  return NextResponse.json({
    ok: true,
    runAtUtc: argParts.isoUtc,
    argentinaHour: currentHour,
    argentinaToday: todayYmd,
    argentinaTomorrow: tomorrowYmd,
    forceMode,
    scanned: appointments?.length ?? 0,
    decisions,
  });
}
