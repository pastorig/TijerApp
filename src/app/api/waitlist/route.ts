import { NextResponse } from "next/server";
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildWaitlistEmailHtml(params: {
  barbershopName: string;
  barbershopSlug: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceName: string;
  barberName: string | null;
  preferredDate: string;
  preferredTimeFrom: string | null;
  preferredTimeTo: string | null;
  notes: string | null;
  receivedAt: string;
  siteUrl: string;
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
  const formattedPreferredDate = (() => {
    try {
      const d = new Date(`${params.preferredDate}T12:00:00`);
      return d.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return params.preferredDate;
    }
  })();

  const phoneDigits = params.customerPhone.replace(/\D+/g, "");
  const safeName = escapeHtml(params.customerName);
  const safePhone = escapeHtml(params.customerPhone);
  const safeEmail = params.customerEmail
    ? escapeHtml(params.customerEmail)
    : "—";
  const safeService = escapeHtml(params.serviceName);
  const safeBarber = params.barberName ? escapeHtml(params.barberName) : "—";
  const safeNotes = params.notes
    ? escapeHtml(params.notes).replace(/\n/g, "<br>")
    : null;
  const safeBarbershopName = escapeHtml(params.barbershopName);
  const safeFormattedPreferredDate = escapeHtml(formattedPreferredDate);
  const timeRange =
    params.preferredTimeFrom && params.preferredTimeTo
      ? `${params.preferredTimeFrom} – ${params.preferredTimeTo}`
      : params.preferredTimeFrom || "Cualquier horario";

  const waMessage = encodeURIComponent(
    `Hola ${params.customerName}! Soy de ${params.barbershopName}, vi que te anotaste en la lista de espera para el ${formattedPreferredDate}. Te aviso por si te puedo dar un turno.`,
  );
  const waLink = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${waMessage}`
    : null;
  const adminLink = `${params.siteUrl.replace(/\/$/, "")}/${params.barbershopSlug}/admin/lista-espera`;

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
                ${safeBarbershopName} · Lista de espera
              </p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;">
                Nueva persona anotada
              </h1>
              <p style="margin:6px 0 0;font-size:12px;color:#9a9a9a;">
                Recibido ${fmtDate}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#9a9a9a;letter-spacing:0.16em;">Cliente</p>
              <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#fff;">${safeName}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="50%" style="padding-right:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#9a9a9a;letter-spacing:0.16em;">Telefono</p>
                    <p style="margin:0;font-size:13px;font-family:monospace;color:#fff;">${safePhone}</p>
                  </td>
                  <td width="50%" style="padding-left:8px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#9a9a9a;letter-spacing:0.16em;">Email</p>
                    <p style="margin:0;font-size:13px;font-family:monospace;color:#fff;">${safeEmail}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#9a9a9a;letter-spacing:0.16em;">Quiere</p>
              <div style="margin:0 0 20px;padding:16px;background:#1a1a1a;border-radius:8px;">
                <p style="margin:0;font-size:14px;color:#fff;"><strong>${safeService}</strong> con ${safeBarber}</p>
                <p style="margin:8px 0 0;font-size:13px;color:#c9a23e;">${safeFormattedPreferredDate}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#9a9a9a;font-family:monospace;">${timeRange}</p>
              </div>

              ${
                safeNotes
                  ? `<p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#9a9a9a;letter-spacing:0.16em;">Notas del cliente</p>
                     <div style="margin:0 0 20px;padding:14px;background:#1a1a1a;border-radius:8px;font-size:13px;line-height:1.5;color:#e6e6e6;font-style:italic;">${safeNotes}</div>`
                  : ""
              }

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                <tr>
                  ${
                    waLink
                      ? `<td style="padding-right:6px;">
                          <a href="${waLink}" style="display:block;padding:12px 16px;background:#25d366;border-radius:8px;color:#fff;font-size:13px;font-weight:700;text-decoration:none;text-align:center;text-transform:uppercase;letter-spacing:0.14em;">
                            Avisarle por WhatsApp
                          </a>
                        </td>`
                      : ""
                  }
                  <td style="padding-left:${waLink ? "6px" : "0"};">
                    <a href="${adminLink}" style="display:block;padding:12px 16px;background:#c9a23e;border-radius:8px;color:#000;font-size:13px;font-weight:700;text-decoration:none;text-align:center;text-transform:uppercase;letter-spacing:0.14em;">
                      Ver en admin
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * POST /api/waitlist
 *
 * Inserción pública en la lista de espera de una barbería.
 * Para el flow desde /reservar cuando el cliente no encuentra slot.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  const barberId =
    typeof payload.barberId === "string" ? payload.barberId : "";
  const serviceName =
    typeof payload.serviceName === "string" ? payload.serviceName : "";
  const customerName =
    typeof payload.customerName === "string" ? payload.customerName.trim() : "";
  const customerPhone =
    typeof payload.customerPhone === "string"
      ? payload.customerPhone.trim()
      : "";
  const preferredDate =
    typeof payload.preferredDate === "string" ? payload.preferredDate : "";

  if (
    !barbershopSlug ||
    !barberId ||
    !serviceName ||
    !customerName ||
    !customerPhone ||
    !preferredDate
  ) {
    return NextResponse.json(
      { error: "Faltan datos obligatorios." },
      { status: 400 },
    );
  }

  const customerEmail =
    typeof payload.customerEmail === "string" && payload.customerEmail.trim()
      ? payload.customerEmail.trim()
      : null;
  const preferredTimeFrom =
    typeof payload.preferredTimeFrom === "string" &&
    /^\d{2}:\d{2}/.test(payload.preferredTimeFrom)
      ? payload.preferredTimeFrom
      : null;
  const preferredTimeTo =
    typeof payload.preferredTimeTo === "string" &&
    /^\d{2}:\d{2}/.test(payload.preferredTimeTo)
      ? payload.preferredTimeTo
      : null;
  const notes =
    typeof payload.notes === "string" && payload.notes.trim()
      ? payload.notes.trim()
      : null;
  const serviceDurationMinutes =
    typeof payload.serviceDurationMinutes === "number" &&
    payload.serviceDurationMinutes > 0
      ? payload.serviceDurationMinutes
      : 30;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("waitlist_entries")
    .insert({
      barbershop_slug: barbershopSlug,
      barber_id: barberId,
      service_name: serviceName,
      service_duration_minutes: serviceDurationMinutes,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      preferred_date: preferredDate,
      preferred_time_from: preferredTimeFrom,
      preferred_time_to: preferredTimeTo,
      notes,
    })
    .select("id, created_at")
    .single();

  if (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "No pudimos guardarte en la lista." },
      { status: 500 },
    );
  }

  // ── Notificación al owner (no bloqueante) ──────────────────────────
  void sendWaitlistOwnerNotification({
    supabase,
    barbershopSlug,
    barberId,
    customerName,
    customerPhone,
    customerEmail,
    serviceName,
    preferredDate,
    preferredTimeFrom,
    preferredTimeTo,
    notes,
    receivedAt: data?.created_at ?? new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id: data?.id }, { status: 201 });
}

type WaitlistNotificationInput = {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  barbershopSlug: string;
  barberId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceName: string;
  preferredDate: string;
  preferredTimeFrom: string | null;
  preferredTimeTo: string | null;
  notes: string | null;
  receivedAt: string;
};

async function sendWaitlistOwnerNotification(
  input: WaitlistNotificationInput,
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  const fromAddress =
    process.env.OWNER_NOTIFICATION_FROM || "BarberSync <onboarding@resend.dev>";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://barber-sync-iota.vercel.app";

  if (!resendApiKey || !ownerEmail) return;

  try {
    const [barbershopResult, barberResult] = await Promise.all([
      input.supabase
        .from("barbershops")
        .select("name")
        .eq("slug", input.barbershopSlug)
        .maybeSingle(),
      input.supabase
        .from("barbers")
        .select("display_name, name")
        .eq("id", input.barberId)
        .maybeSingle(),
    ]);

    const barbershopName =
      barbershopResult.data?.name ?? input.barbershopSlug;
    const barberName =
      barberResult.data?.display_name ?? barberResult.data?.name ?? null;

    const resend = new Resend(resendApiKey);
    const html = buildWaitlistEmailHtml({
      barbershopName,
      barbershopSlug: input.barbershopSlug,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      serviceName: input.serviceName,
      barberName,
      preferredDate: input.preferredDate,
      preferredTimeFrom: input.preferredTimeFrom,
      preferredTimeTo: input.preferredTimeTo,
      notes: input.notes,
      receivedAt: input.receivedAt,
      siteUrl,
    });

    const result = await resend.emails.send({
      from: fromAddress,
      to: [ownerEmail],
      subject: `${barbershopName} · ${input.customerName} se anotó en lista de espera`,
      html,
    });

    if (result.error) {
      Sentry.captureException(result.error);
      console.error("[waitlist] resend error", result.error);
    }
  } catch (emailError) {
    Sentry.captureException(emailError);
    console.error("[waitlist] resend exception", emailError);
  }
}
