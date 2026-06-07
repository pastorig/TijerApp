import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * GET /api/cron/monthly-reports
 *
 * Job mensual que envía resumen del MES ANTERIOR a cada owner de cada
 * barbería. Llamado desde GitHub Actions el día 1 de cada mes ~9 AM ART.
 *
 * Para cada barbería con programa activo:
 *  1. Trae appointments del mes anterior
 *  2. Calcula métricas (total, confirmed, cancelled, revenue, top servicios,
 *     top barberos)
 *  3. Envía email al owner via Resend con HTML formato dark/gold
 *  4. Logea decisión en monthly_reports_log (futuro)
 *
 * Authorization: Bearer CRON_SECRET
 */

function formatARS(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function getPreviousMonth(): { start: string; end: string; label: string } {
  const today = new Date();
  // El día 1 del MES ACTUAL marca el inicio del nuevo mes. El mes anterior
  // va desde el día 1 al último día del mes pasado.
  const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfPrevMonth = new Date(firstOfCurrentMonth.getTime() - 1);
  const firstOfPrevMonth = new Date(
    lastOfPrevMonth.getFullYear(),
    lastOfPrevMonth.getMonth(),
    1,
  );

  function toYmd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const monthName = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(lastOfPrevMonth);

  return {
    start: toYmd(firstOfPrevMonth),
    end: toYmd(lastOfPrevMonth),
    label: monthName.replace(/^./, (c) => c.toUpperCase()),
  };
}

export async function GET(request: Request) {
  // Validar CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured." },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ") ||
    authHeader.slice("Bearer ".length) !== cronSecret
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({
      ok: true,
      skipped: "RESEND_API_KEY missing",
    });
  }

  const resend = new Resend(resendKey);
  const supabase = getSupabaseAdminClient();
  const fromAddress =
    process.env.REMINDER_EMAIL_FROM ||
    process.env.OWNER_NOTIFICATION_FROM ||
    "TijerApp <onboarding@resend.dev>";

  const period = getPreviousMonth();

  try {
    // Listar barberías activas
    const { data: barbershops, error: bsError } = await supabase
      .from("barbershops")
      .select("slug, name");

    if (bsError) {
      Sentry.captureException(bsError, {
        tags: { route: "cron/monthly-reports", step: "list_barbershops" },
      });
      return NextResponse.json(
        { error: "Error listing barbershops" },
        { status: 500 },
      );
    }

    const sent: Array<{ slug: string; email: string; status: string }> = [];

    for (const bs of (barbershops ?? []) as Array<{
      slug: string;
      name: string;
    }>) {
      // Buscar owner de la barbería
      const { data: ownerRow } = await supabase
        .from("barbershop_admins")
        .select("user_id")
        .eq("barbershop_slug", bs.slug)
        .eq("is_owner", true)
        .maybeSingle();

      if (!ownerRow) {
        sent.push({ slug: bs.slug, email: "(no owner)", status: "skipped" });
        continue;
      }

      // Email del owner
      const { data: userInfo } = await supabase.auth.admin.getUserById(
        (ownerRow as { user_id: string }).user_id,
      );
      const ownerEmail = userInfo?.user?.email;
      if (!ownerEmail) {
        sent.push({ slug: bs.slug, email: "(no email)", status: "skipped" });
        continue;
      }

      // Métricas del mes anterior
      const { data: apps } = await supabase
        .from("appointments")
        .select("status, service_name, service_price, barber_name, appointment_date")
        .eq("barbershop_slug", bs.slug)
        .gte("appointment_date", period.start)
        .lte("appointment_date", period.end);

      const appList = (apps ?? []) as Array<{
        status: string;
        service_name: string;
        service_price: number;
        barber_name: string;
        appointment_date: string;
      }>;
      const confirmed = appList.filter(
        (a) => a.status === "confirmed" || a.status === "pending",
      );
      const cancelled = appList.filter(
        (a) => a.status === "cancelled" || a.status === "deleted",
      );
      const revenue = confirmed.reduce(
        (acc, a) => acc + (Number(a.service_price) || 0),
        0,
      );
      const avgTicket = confirmed.length > 0 ? revenue / confirmed.length : 0;

      // Top 3 servicios + Top 3 barberos
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      const barberMap = new Map<string, { count: number; revenue: number }>();
      for (const a of confirmed) {
        const sv = serviceMap.get(a.service_name) ?? { count: 0, revenue: 0 };
        sv.count += 1;
        sv.revenue += Number(a.service_price) || 0;
        serviceMap.set(a.service_name, sv);

        const bb = barberMap.get(a.barber_name) ?? { count: 0, revenue: 0 };
        bb.count += 1;
        bb.revenue += Number(a.service_price) || 0;
        barberMap.set(a.barber_name, bb);
      }

      const topServices = Array.from(serviceMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 3);
      const topBarbers = Array.from(barberMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 3);

      const subject = `${bs.name} · Resumen ${period.label}`;

      const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:32px;">
        <tr><td style="padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#c9a23e;">${bs.name}</p>
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:900;color:#fff;">Resumen ${period.label}</h1>
        </td></tr>

        <tr><td style="padding:24px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:12px;background:#161616;border-radius:4px;width:48%;">
                <p style="margin:0;font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:#8a8a8a;">Turnos confirmados</p>
                <p style="margin:6px 0 0;font-size:24px;font-weight:900;color:#fff;">${confirmed.length}</p>
              </td>
              <td width="4%"></td>
              <td style="padding:12px;background:rgba(201,162,62,0.08);border-left:3px solid #c9a23e;border-radius:4px;width:48%;">
                <p style="margin:0;font-size:9px;text-transform:uppercase;letter-spacing:0.14em;color:#c9a23e;">Ingresos</p>
                <p style="margin:6px 0 0;font-size:24px;font-weight:900;color:#fff;">${formatARS(revenue)}</p>
              </td>
            </tr>
          </table>

          <p style="margin:16px 0 0;font-size:12px;color:#c8c8c8;">
            <strong>Ticket promedio:</strong> ${formatARS(avgTicket)}<br>
            <strong>Cancelados:</strong> ${cancelled.length} ${appList.length > 0 ? `(${((cancelled.length / appList.length) * 100).toFixed(1)}%)` : ""}
          </p>
        </td></tr>

        ${topServices.length > 0 ? `
        <tr><td style="padding-top:16px;">
          <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#c9a23e;">Top 3 servicios</p>
          <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;border:1px solid rgba(255,255,255,0.06);font-size:12px;">
            ${topServices.map(([name, v]) => `<tr><td style="border-bottom:1px solid rgba(255,255,255,0.04);color:#fff;">${name}</td><td style="border-bottom:1px solid rgba(255,255,255,0.04);color:#c8c8c8;text-align:right;">${v.count} · ${formatARS(v.revenue)}</td></tr>`).join("")}
          </table>
        </td></tr>` : ""}

        ${topBarbers.length > 0 ? `
        <tr><td style="padding-top:16px;">
          <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#c9a23e;">Top 3 barberos</p>
          <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;border:1px solid rgba(255,255,255,0.06);font-size:12px;">
            ${topBarbers.map(([name, v]) => `<tr><td style="border-bottom:1px solid rgba(255,255,255,0.04);color:#fff;">${name}</td><td style="border-bottom:1px solid rgba(255,255,255,0.04);color:#c8c8c8;text-align:right;">${v.count} · ${formatARS(v.revenue)}</td></tr>`).join("")}
          </table>
        </td></tr>` : ""}

        <tr><td style="padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;color:#5a5a5a;">Generado automáticamente por TijerApp. Si querés un PDF detallado entrá al panel admin.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      try {
        await resend.emails.send({
          from: fromAddress,
          to: ownerEmail,
          subject,
          html,
        });
        sent.push({ slug: bs.slug, email: ownerEmail, status: "sent" });
      } catch (err) {
        Sentry.captureException(err, {
          tags: { route: "cron/monthly-reports", step: "send", slug: bs.slug },
        });
        sent.push({ slug: bs.slug, email: ownerEmail, status: "error" });
      }
    }

    return NextResponse.json({
      ok: true,
      period: period.label,
      sent,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "cron/monthly-reports" },
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
