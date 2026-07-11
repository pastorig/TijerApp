import { NextResponse } from "next/server";
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { sendClientPushForAppointment } from "@/lib/push/sendClientPush";
import { resolveEmailFrom } from "@/lib/email/from";

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
  logo_url: string | null;
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
  /** URL pública del logo de la barbería (CDN). Si está, se muestra arriba. */
  barbershopLogoUrl?: string | null;
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

  // Logo del barbero arriba (white-label parcial). Si no hay logo, fallback
  // al texto del nombre con tracking gold.
  const headerBranding = params.barbershopLogoUrl
    ? `<img src="${params.barbershopLogoUrl}" alt="${params.barbershopName}" width="64" height="64" style="display:inline-block;width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #c9a23e;" />
       <p style="margin:8px 0 0;font-size:13px;font-weight:700;color:#fff;">${params.barbershopName}</p>`
    : `<p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#c9a23e;">${params.barbershopName}</p>`;

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:32px 16px;">
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#0f0f0f;border:1px solid #1f1f1f;border-radius:12px;">
        <tr><td style="padding:28px 24px 12px;text-align:center;">
          ${headerBranding}
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

  // Trae turnos de hoy y mañana (pending/confirmed). NO filtramos por email:
  // un cliente puede tener push activado sin haber dejado email, y igual
  // debe recibir el recordatorio por push. El filtro por canal se hace en
  // el loop (hasEmail / hasPush).
  const { data: appointments, error: apptError } = await supabase
    .from("appointments")
    .select(
      "id, barbershop_slug, customer_name, customer_email, service_name, barber_name, appointment_date, appointment_time, confirmation_token, status",
    )
    .in("appointment_date", [todayYmd, tomorrowYmd])
    .in("status", ["pending", "confirmed"]);

  if (apptError) {
    Sentry.captureException(apptError);
    return NextResponse.json({ error: apptError.message }, { status: 500 });
  }

  // Trae los recordatorios ya enviados para evitar duplicados.
  const appointmentIds = (appointments ?? [])
    .map((a) => a.id)
    .filter((id): id is string => Boolean(id));

  // Dedup por (appointment, kind, channel). El Set guarda claves
  // "{kind}:{channel}" — ej "reminder_24h:email", "confirmation:push".
  // Así email y push se deduplican independiente: si el email se mandó
  // pero el push no, el push igual se intenta el próximo run.
  const sentMap = new Map<string, Set<string>>();
  if (appointmentIds.length > 0) {
    const { data: logs } = await supabase
      .from("reminder_log")
      .select("appointment_id, kind, channel")
      .eq("status", "sent")
      .in("appointment_id", appointmentIds);
    for (const log of logs ?? []) {
      const set = sentMap.get(log.appointment_id) ?? new Set<string>();
      set.add(`${log.kind}:${log.channel}`);
      sentMap.set(log.appointment_id, set);
    }
  }

  // Pre-fetch: qué appointments tienen al menos una push subscription activa.
  // Sirve para no entrar a la ventana de push (ni querear el sender) en
  // turnos donde el cliente nunca activó push. Sin esto, cada run intentaría
  // push en TODOS los turnos.
  const pushSubAppointmentIds = new Set<string>();
  if (appointmentIds.length > 0) {
    const { data: pushSubs } = await supabase
      .from("client_push_subscriptions")
      .select("appointment_id")
      .is("expired_at", null)
      .in("appointment_id", appointmentIds);
    for (const s of pushSubs ?? []) {
      const row = s as { appointment_id: string };
      pushSubAppointmentIds.add(row.appointment_id);
    }
  }

  // Cache de barbershops para el name.
  const barbershopBySlug = new Map<string, BarbershopInfo>();
  async function getBarbershop(slug: string): Promise<BarbershopInfo> {
    const cached = barbershopBySlug.get(slug);
    if (cached) return cached;
    const { data } = await supabase
      .from("barbershops")
      .select("slug, name, logo_url")
      .eq("slug", slug)
      .maybeSingle();
    const info: BarbershopInfo = {
      slug,
      name: data?.name ?? slug,
      logo_url: (data as { logo_url?: string | null } | null)?.logo_url ?? null,
    };
    barbershopBySlug.set(slug, info);
    return info;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = resolveEmailFrom();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://tijerapp.com";

  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  const decisions: Array<{
    appointmentId: string;
    kind: "reminder_24h" | "confirmation";
    sent: boolean;
    skipped?: string;
    error?: string;
  }> = [];

  for (const appointment of (appointments ?? []) as AppointmentForReminder[]) {
    // Antes salteábamos si no había email. Ahora procesamos igual: puede
    // tener push aunque no tenga email. Solo necesitamos el id.
    if (!appointment.id) continue;
    const apptDate = appointment.appointment_date;
    const apptHour = getHourFromTime(appointment.appointment_time);
    const sentKinds = sentMap.get(appointment.id) ?? new Set<string>();
    const hasEmail = Boolean(appointment.customer_email);
    const hasPush = pushSubAppointmentIds.has(appointment.id);

    // Un kind está "pendiente" si algún canal disponible todavía no se
    // mandó. Email cuenta solo si hay email; push solo si hay subs.
    function isPending(kind: "reminder_24h" | "confirmation"): boolean {
      const emailPending = hasEmail && !sentKinds.has(`${kind}:email`);
      const pushPending = hasPush && !sentKinds.has(`${kind}:push`);
      return emailPending || pushPending;
    }

    // Si no hay ningún canal (sin email y sin push), no hay nada que hacer.
    if (!hasEmail && !hasPush) continue;

    // ── Reminder 24h ──────────────────────────────────────────────
    const isTomorrow = apptDate === tomorrowYmd;
    const reminderInWindow =
      forceMode || (currentHour >= 17 && currentHour <= 20);
    if (isTomorrow && reminderInWindow && isPending("reminder_24h")) {
      const ok = await sendOne(appointment, "reminder_24h");
      decisions.push({ appointmentId: appointment.id, kind: "reminder_24h", ...ok });
      continue;
    }

    // ── Confirmación ──────────────────────────────────────────────
    const isToday = apptDate === todayYmd;
    if (isToday && isPending("confirmation")) {
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
      isPending("confirmation")
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
    const sent = sentMap.get(appointment.id!) ?? new Set<string>();
    const barbershop = await getBarbershop(appointment.barbershop_slug);
    const time = appointment.appointment_time.slice(0, 5);

    let anySent = false;
    const notes: string[] = [];

    // ─── CANAL EMAIL ──────────────────────────────────────────────
    // Solo si hay Resend configurado, el cliente tiene email, y no se
    // mandó ya el email de este kind.
    if (
      resend &&
      appointment.customer_email &&
      !sent.has(`${kind}:email`)
    ) {
      const responderUrl = appointment.confirmation_token
        ? `${siteUrl.replace(/\/$/, "")}/r/${appointment.confirmation_token}/responder`
        : null;
      const subject =
        kind === "confirmation"
          ? `Te esperamos hoy en ${barbershop.name}`
          : `Recordatorio: tenés turno mañana en ${barbershop.name}`;
      const html = buildReminderEmailHtml({
        barbershopName: barbershop.name,
        barbershopLogoUrl: barbershop.logo_url,
        customerName: appointment.customer_name,
        serviceName: appointment.service_name,
        barberName: appointment.barber_name,
        date: appointment.appointment_date,
        time,
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
          notes.push(`email_failed:${result.error.message}`);
        } else {
          await supabase.from("reminder_log").insert({
            appointment_id: appointment.id,
            kind,
            channel: "email",
            status: "sent",
          });
          anySent = true;
        }
      } catch (sendError) {
        const message =
          sendError instanceof Error ? sendError.message : "unknown error";
        Sentry.captureException(sendError, {
          tags: { route: "cron/reminders", step: "email" },
        });
        await supabase.from("reminder_log").insert({
          appointment_id: appointment.id,
          kind,
          channel: "email",
          status: "failed",
          error_message: message,
        });
        notes.push(`email_error:${message}`);
      }
    }

    // ─── CANAL PUSH (independiente del email) ─────────────────────
    // Si el cliente activó push en /r/[token], le mandamos recordatorio
    // al navegador. Funciona SIN dominio (no usa Resend) — es el único
    // recordatorio automático que le llega al cliente sin email.
    if (!sent.has(`${kind}:push`)) {
      try {
        const pushTitle =
          kind === "confirmation"
            ? `Te esperamos hoy en ${barbershop.name}`
            : `Recordatorio · ${barbershop.name}`;
        const pushBody =
          kind === "confirmation"
            ? `Hoy a las ${time}hs con ${appointment.barber_name}.`
            : `Mañana a las ${time}hs con ${appointment.barber_name}.`;
        const pushUrl = appointment.confirmation_token
          ? `/r/${appointment.confirmation_token}`
          : "/";

        const pushResult = await sendClientPushForAppointment(appointment.id!, {
          title: pushTitle,
          body: pushBody,
          url: pushUrl,
        });

        if (pushResult.sent > 0) {
          await supabase.from("reminder_log").insert({
            appointment_id: appointment.id,
            kind,
            channel: "push",
            status: "sent",
          });
          anySent = true;
        }
      } catch (pushError) {
        Sentry.captureException(pushError, {
          tags: { route: "cron/reminders", step: "clientPush" },
        });
        notes.push("push_error");
      }
    }

    if (anySent) {
      return { sent: true };
    }
    return {
      sent: false,
      error: notes.length > 0 ? notes.join("; ") : undefined,
      skipped: notes.length === 0 ? "nothing_to_send" : undefined,
    };
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
