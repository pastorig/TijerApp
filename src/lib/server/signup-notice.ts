import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { resolveEmailFrom } from "@/lib/email/from";

/**
 * Aviso al dueño de TijerApp cuando una barbería se da de alta sola.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 * El alta self-serve no avisaba a nadie: una barbería se registraba, quemaba
 * su trial y recién se descubría mirando la base a mano. Pasó con la primera
 * que entró por este camino — se anotó de madrugada, dejó todo listo y nunca
 * volvió; para cuando se vio, ya llevaba cinco días parada. Los primeros días
 * son justo cuando un mensaje sirve, así que el aviso tiene que llegar solo.
 *
 * No es bloqueante: si el mail falla, la barbería igual quedó creada y el
 * barbero entra normalmente. Nunca hay que voltear un alta por un aviso.
 */

export type AltaDeBarberia = {
  slug: string;
  nombre: string;
  dueño: string;
  email: string;
  whatsapp: string;
  /** El mail ya tenía cuenta: entra con su contraseña vieja, no con la nueva. */
  cuentaYaExistía: boolean;
  diasDeTrial: number;
};

/**
 * Un `wa.me` que funcione con lo que el barbero escribió en el formulario.
 *
 * Ahí cargan el teléfono como se lo dicen a un cliente ("3454 07-5211"), sin
 * código de país. Sacarle los símbolos no alcanza: `wa.me/3454075211` no abre
 * ningún chat. Los diez dígitos sueltos son un celular argentino, así que se
 * le antepone el 54 de país y el 9 de móvil; si ya vino con el 54, se respeta
 * lo que puso.
 */
function linkDeWhatsApp(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length < 8) return null;
  const internacional = digitos.startsWith("54") ? digitos : `549${digitos}`;
  return `https://wa.me/${internacional}`;
}

function fechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function avisarAltaDeBarberia(alta: AltaDeBarberia): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const destino = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!resendApiKey || !destino) {
    console.warn(
      "[registro] no se avisa el alta: falta RESEND_API_KEY u OWNER_NOTIFICATION_EMAIL",
    );
    return;
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://tijerapp.com"
  ).replace(/\/$/, "");
  const pagina = `${siteUrl}/${alta.slug}`;
  const wa = linkDeWhatsApp(alta.whatsapp);
  const vence = new Date(Date.now() + alta.diasDeTrial * 24 * 60 * 60 * 1000);

  const filas: Array<[string, string]> = [
    ["Barbería", escapar(alta.nombre)],
    ["Dueño", escapar(alta.dueño)],
    [
      "Mail",
      `<a href="mailto:${escapar(alta.email)}" style="color:#c9a23e">${escapar(alta.email)}</a>`,
    ],
    [
      "WhatsApp",
      wa
        ? `<a href="${wa}" style="color:#c9a23e">${escapar(alta.whatsapp)}</a>`
        : escapar(alta.whatsapp),
    ],
    [
      "Su página",
      `<a href="${pagina}" style="color:#c9a23e">${escapar(pagina)}</a>`,
    ],
    ["Trial", `${alta.diasDeTrial} días · vence el ${fechaLarga(vence)}`],
  ];

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;color:#111">
      <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a7433;margin:0 0 4px">
        TijerApp
      </p>
      <h1 style="font-size:20px;margin:0 0 16px">Se registró ${escapar(alta.nombre)}</h1>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        ${filas
          .map(
            ([etiqueta, valor]) => `
          <tr>
            <td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top">${etiqueta}</td>
            <td style="padding:6px 0"><strong>${valor}</strong></td>
          </tr>`,
          )
          .join("")}
      </table>
      ${
        alta.cuentaYaExistía
          ? `<p style="margin:16px 0 0;padding:10px 12px;background:#fdf6e3;border-left:3px solid #c9a23e;font-size:13px;line-height:1.5">
               Ese mail <strong>ya tenía cuenta</strong>: entra con su contraseña de antes,
               no con la que acaba de escribir. Si se traba, es por esto.
             </p>`
          : ""
      }
      <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#555">
        Los primeros días son los que cuentan. Si en un par no cargó nada ni compartió
        el link, conviene escribirle.
      </p>
    </div>`;

  try {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: resolveEmailFrom(),
      to: [destino],
      subject: `TijerApp · Se registró ${alta.nombre}`,
      html,
      replyTo: alta.email,
    });
    if (error) {
      Sentry.captureException(error);
      console.error("[registro] resend error", error);
    }
  } catch (e) {
    Sentry.captureException(e);
    console.error("[registro] resend exception", e);
  }
}
