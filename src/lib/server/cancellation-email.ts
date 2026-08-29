import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolveEmailFrom } from "@/lib/email/from";
import {
  debeAvisarCancelacion,
  telefonoUtilizable,
} from "@/lib/cancellation-notice";

/**
 * El mail que le avisa al cliente que le cancelaron el turno.
 *
 * Lo mandan el panel del dueño y la agenda del empleado. Hasta la feature 026
 * no lo mandaba nadie: al mover un turno el cliente se enteraba, al cancelarlo
 * no — y de las dos, la que lo deja plantado en la puerta es la cancelación.
 *
 * ── No siempre corresponde ──────────────────────────────────────────────────
 * La decisión de si mandar o callarse vive en `debeAvisarCancelacion`, que es
 * puro y está testeado. Acá se le pregunta y se respeta: al que no vino y al
 * que pidió cancelar no se les escribe.
 *
 * ── Falla blando, siempre ───────────────────────────────────────────────────
 * Nunca tira. El turno YA se canceló cuando esto corre: romper la respuesta
 * haría creer que la cancelación falló y alguien la intentaría de nuevo.
 *
 * **No valida permisos.** Eso lo hace la ruta antes de llamar.
 */

export type AvisoDeCancelacion = {
  sent: boolean;
  /** Por qué no se mandó. Lo muestra la pantalla, así que va en castellano. */
  skipped?: string;
};

const TZ = "America/Argentina/Buenos_Aires";

/** Hoy y ahora en hora argentina, para decidir si el turno ya pasó. */
function ahoraEnArgentina(): { fecha: string; hora: string } {
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const hora = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return { fecha, hora };
}

/** "2026-08-28" → "Viernes 28 de agosto". */
function formatLongDate(ymd: string): string {
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

export async function enviarAvisoDeCancelacion({
  appointmentId,
  barbershopSlug,
}: {
  appointmentId: string;
  barbershopSlug: string;
}): Promise<AvisoDeCancelacion> {
  const supabase = getSupabaseAdminClient();

  const [appointmentRes, barbershopRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, barbershop_slug, customer_name, customer_email, service_name, appointment_date, appointment_time, cancellation_reason",
      )
      .eq("id", appointmentId)
      .maybeSingle(),
    supabase
      .from("barbershops")
      .select("slug, name, whatsapp, logo_url")
      .eq("slug", barbershopSlug)
      .maybeSingle(),
  ]);

  const appointment = appointmentRes.data;
  if (appointmentRes.error || !appointment) {
    return { sent: false, skipped: "no se pudo leer el turno" };
  }
  if (appointment.barbershop_slug !== barbershopSlug) {
    return { sent: false, skipped: "el turno es de otra barbería" };
  }

  const barbershop = barbershopRes.data;
  if (!barbershop) return { sent: false, skipped: "barbería no encontrada" };

  const decision = debeAvisarCancelacion({
    motivo: appointment.cancellation_reason,
    fecha: appointment.appointment_date,
    hora: appointment.appointment_time,
    ahora: ahoraEnArgentina(),
  });
  if (!decision.avisar) {
    return { sent: false, skipped: decision.porque };
  }

  if (!appointment.customer_email) {
    return { sent: false, skipped: "no email" };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { sent: false, skipped: "RESEND_API_KEY missing" };
  }

  const resend = new Resend(resendApiKey);
  const fromAddress = resolveEmailFrom();

  const cuando = `${formatLongDate(appointment.appointment_date)} a las ${appointment.appointment_time.slice(0, 5)}`;
  const subject = `Se canceló tu turno · ${barbershop.name}`;
  const logoUrl = (barbershop as { logo_url?: string | null }).logo_url;
  // Solo si el número sirve: un botón que lleva a wa.me/0000000000 es peor que
  // no tener botón. Ver `telefonoUtilizable`.
  const waUtil = telefonoUtilizable(barbershop.whatsapp);
  // El preheader (lo que se lee en la bandeja antes de abrir) tiene que decir
  // lo mismo que el cuerpo. Decía "Escribinos" siempre, incluso cuando la
  // barbería no tiene un WhatsApp usable y el mail no ofrece por dónde: se vio
  // en la primera prueba real.
  const previewText = waUtil
    ? `Era el ${cuando}. Escribinos y lo reprogramamos.`
    : `Era el ${cuando}. Sacá otro turno cuando te quede cómodo.`;

  const waLink = waUtil
    ? `https://wa.me/${String(barbershop.whatsapp).replace(/\D/g, "")}`
    : null;

  // Mismo lenguaje visual que el mail de reprogramación: negro + gold, estilos
  // en línea para que sobreviva a Gmail, Outlook y Apple Mail.
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#ffffff;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000000;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:32px;">
        <tr><td style="padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06);">
          ${
            logoUrl
              ? `<img src="${logoUrl}" alt="${barbershop.name}" width="48" height="48" style="display:inline-block;width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #c9a23e;vertical-align:middle;margin-right:12px;" />
                 <span style="font-size:13px;font-weight:700;color:#ffffff;vertical-align:middle;">${barbershop.name}</span>`
              : `<p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#c9a23e;">${barbershop.name}</p>`
          }
          <h1 style="margin:14px 0 0 0;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">Se canceló tu turno</h1>
        </td></tr>
        <tr><td style="padding-top:24px;">
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#c8c8c8;">
            Hola <strong style="color:#ffffff;">${appointment.customer_name.split(" ")[0]}</strong>, tuvimos que cancelar tu turno de
            <strong style="color:#ffffff;">${appointment.service_name}</strong>. Perdón por el contratiempo.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
            <tr><td style="background-color:#161616;border-left:3px solid #ef4444;padding:12px 16px;border-radius:4px;">
              <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#8a8a8a;">Era</p>
              <p style="margin:4px 0 0 0;font-size:16px;font-weight:600;color:#c8c8c8;text-decoration:line-through;">${cuando}</p>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#c8c8c8;">
            Si querés, sacá otro turno cuando te quede cómodo${waLink ? " o escribinos y lo vemos juntos" : ""}.
          </p>
          ${
            waLink
              ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;">
                   <tr><td style="background-color:#c9a23e;border-radius:6px;">
                     <a href="${waLink}" style="display:inline-block;padding:12px 24px;font-size:13px;font-weight:700;color:#000000;text-decoration:none;letter-spacing:0.04em;">ESCRIBINOS POR WHATSAPP</a>
                   </td></tr>
                 </table>`
              : ""
          }
        </td></tr>
        <tr><td style="padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#5a5a5a;">
            Este mail se generó automáticamente desde TijerApp.<br>
            ${barbershop.name}${waUtil ? ` · WhatsApp: ${barbershop.whatsapp}` : ""}
          </p>
        </td></tr>
      </table>
    </td></tr>
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
        tags: { origen: "aviso-cancelacion" },
        extra: { appointmentId },
      });
      return { sent: false, skipped: "no pudimos mandar el mail" };
    }
    return { sent: true };
  } catch (err) {
    Sentry.captureException(err, { tags: { origen: "aviso-cancelacion" } });
    return { sent: false, skipped: "no pudimos mandar el mail" };
  }
}
