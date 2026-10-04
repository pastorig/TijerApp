import "server-only";

import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { resolveEmailFrom } from "@/lib/email/from";

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * El pedido de reseña, al día siguiente del turno (feature 033).
 *
 * Antes la reseña había que pedirla a mano: un botón de WhatsApp, turno por
 * turno. Nadie lo tocaba y en toda la plataforma había cero reseñas.
 *
 * ── Dos cuidados en el texto ────────────────────────────────────────────────
 * - **No afirma que la persona estuvo.** El turno se cierra solo; si el cliente
 *   no vino y el barbero no lo marcó, igual le llega este mail. "¿Cómo te fue?"
 *   se banca ese caso; "gracias por venir" no.
 * - **Un solo botón.** Es un mail para contestar en diez segundos.
 *
 * El nombre del cliente y el de la barbería los escribió una persona en un
 * formulario: van escapados.
 */
export async function sendReviewRequestEmail(input: {
  toEmail: string;
  customerName: string;
  barbershopName: string;
  /** Link al formulario público de reseña (`/rev/<token>`). */
  reviewUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { sent: false, error: "RESEND_API_KEY no configurada" };
  }

  const barberia = escaparHtml(input.barbershopName);
  const nombre = escaparHtml(input.customerName.trim().split(/\s+/)[0] ?? "");
  const saludo = nombre ? `Hola ${nombre},` : "Hola,";

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#000000;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">Contanos cómo te fue en ${barberia}. Son diez segundos.</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px;">
          <tr>
            <td style="padding:32px 28px 8px;">
              <p style="margin:0;font-size:13px;letter-spacing:3px;color:#c9a23e;font-weight:bold;text-transform:uppercase;">${barberia}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <h1 style="margin:0 0 12px;font-size:22px;color:#ffffff;">¿Cómo te fue?</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#c8c8c8;">
                ${saludo} ayer tenías turno en ${barberia}. Si nos contás cómo te fue, le das una mano a la barbería y al próximo que esté por elegirla.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">
              <a href="${input.reviewUrl}"
                 style="display:inline-block;background:#c9a23e;color:#000000;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 24px;border-radius:8px;">
                Dejar mi opinión
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8a8a;">
                Son diez segundos: unas estrellas y, si querés, un comentario.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#5a5a5a;">Reservaste con TijerApp · Turnos online para barberías</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const resend = new Resend(resendKey);
    // Resend no tira excepción cuando rechaza un mail: devuelve `error`.
    const { error } = await resend.emails.send({
      from: resolveEmailFrom(),
      to: input.toEmail,
      subject: `¿Cómo te fue en ${input.barbershopName}?`,
      html,
      // Único por mail: sin esto Gmail junta los que tienen el mismo asunto y
      // esconde el contenido repetido detrás de los tres puntitos.
      headers: { "X-Entity-Ref-ID": randomUUID() },
    });
    if (error) {
      Sentry.captureException(new Error(`Resend: ${error.message}`), {
        tags: { origen: "pedido-resena" },
      });
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (error) {
    Sentry.captureException(error, { tags: { origen: "pedido-resena" } });
    return {
      sent: false,
      error: error instanceof Error ? error.message : "error desconocido",
    };
  }
}
