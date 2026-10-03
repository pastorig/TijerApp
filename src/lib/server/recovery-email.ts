import "server-only";

import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { resolveEmailFrom } from "@/lib/email/from";

/**
 * El mail de "olvidé mi contraseña", mandado por la app y no por Supabase.
 *
 * ── Por qué no lo manda Supabase ────────────────────────────────────────────
 * Gmail agrupa en una misma conversación los mails con el mismo asunto y, si
 * el contenido se repite, esconde lo repetido detrás de "…". Quien pide el link
 * dos veces —porque el primero tardó, lo más común del mundo— abría el segundo
 * mail y lo veía VACÍO: había que tocar los tres puntitos para encontrar el
 * botón. Supabase no deja agregar cabeceras a sus mails; Resend sí, y con
 * `X-Entity-Ref-ID` único cada mail queda como una conversación aparte.
 *
 * De paso el mail queda en el mismo molde que el resto de los que manda la app.
 */
export async function sendRecoveryEmail(input: {
  toEmail: string;
  /** El link de Supabase que abre la sesión de recuperación. Vale 1 hora. */
  actionLink: string;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[recuperar] RESEND_API_KEY missing — no se manda el mail");
    return false;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#000000;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">Tocá el botón para elegir una contraseña nueva. El link sirve por una hora.</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px;">
          <tr>
            <td style="padding:32px 28px 8px;">
              <p style="margin:0;font-size:13px;letter-spacing:3px;color:#c9a23e;font-weight:bold;">TIJERAPP</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <h1 style="margin:0 0 12px;font-size:22px;color:#ffffff;">Cambiá tu contraseña</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#c8c8c8;">
                Pediste entrar con una contraseña nueva. Tocá el botón y elegila.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">
              <a href="${input.actionLink}"
                 style="display:inline-block;background:#c9a23e;color:#000000;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 24px;border-radius:8px;">
                Elegir contraseña nueva
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 32px;">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#8a8a8a;">
                El link sirve por una hora y una sola vez. Si pediste más de uno, usá el último.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#8a8a8a;">
                Si no lo pediste vos, ignorá este mail: tu contraseña sigue siendo la misma.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#5a5a5a;">TijerApp · Turnos online para barberías</p>
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
      subject: "Cambiá tu contraseña de TijerApp",
      html,
      // Único por mail: sin esto Gmail los junta en una conversación y esconde
      // el contenido repetido detrás de los tres puntitos.
      headers: { "X-Entity-Ref-ID": randomUUID() },
    });
    if (error) {
      Sentry.captureException(new Error(`Resend: ${error.message}`), {
        tags: { origen: "recuperar-contrasena" },
      });
      return false;
    }
    return true;
  } catch (error) {
    Sentry.captureException(error, { tags: { origen: "recuperar-contrasena" } });
    return false;
  }
}
