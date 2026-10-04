import "server-only";

import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { resolveEmailFrom } from "@/lib/email/from";
import { founderWaLink } from "@/lib/founder";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  mensajeParaClientes,
  textoParaBio,
  urlDeReservas,
  type TipoDeActivacion,
} from "@/lib/activacion";

/**
 * Los mails de activación (feature 034): bienvenida, día 1, día 3, día 7 y el
 * aviso al fundador.
 *
 * Los cuatro mails al barbero apuntan a una sola cosa: que ponga su link
 * delante de sus clientes. Las barberías que se registraron y nunca tuvieron
 * un turno habían dejado TODO configurado — lo único que no pasó fue eso.
 *
 * El nombre de la barbería y el del dueño los escribió una persona en un
 * formulario: van escapados.
 */

type Supabase = ReturnType<typeof getSupabaseAdminClient>;

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tijerapp.com").replace(/\/$/, "");
}

export type BarberiaParaActivar = {
  slug: string;
  nombre: string;
  /** Mail del dueño. */
  email: string;
  /** Nombre del dueño, si se conoce. */
  dueño?: string | null;
  /** Días de prueba que le quedan (solo lo usa el mail del día 7). */
  diasDePruebaRestantes?: number;
};

/** El molde común: marca, título, párrafos, un botón y, si hay, un bloque para copiar. */
function plantilla(partes: {
  preheader: string;
  titulo: string;
  parrafos: string[];
  boton: { texto: string; href: string };
  bloque?: { etiqueta: string; contenido: string };
  pie?: string;
}): string {
  const parrafos = partes.parrafos
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#c8c8c8;">${p}</p>`,
    )
    .join("");
  const bloque = partes.bloque
    ? `<tr><td style="padding:0 28px 20px;">
         <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;color:#8a8a8a;font-weight:bold;text-transform:uppercase;">${partes.bloque.etiqueta}</p>
         <p style="margin:0;padding:12px 14px;background:#161616;border:1px solid #1f1f1f;border-radius:8px;font-size:14px;line-height:1.5;color:#ffffff;white-space:pre-line;">${partes.bloque.contenido}</p>
       </td></tr>`
    : "";
  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#000000;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${partes.preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px;">
        <tr><td style="padding:32px 28px 8px;">
          <p style="margin:0;font-size:13px;letter-spacing:3px;color:#c9a23e;font-weight:bold;">TIJERAPP</p>
        </td></tr>
        <tr><td style="padding:8px 28px 6px;">
          <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#ffffff;">${partes.titulo}</h1>
          ${parrafos}
        </td></tr>
        ${bloque}
        <tr><td style="padding:0 28px 28px;">
          <a href="${partes.boton.href}" style="display:inline-block;background:#c9a23e;color:#000000;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 24px;border-radius:8px;">${partes.boton.texto}</a>
        </td></tr>
        ${
          partes.pie
            ? `<tr><td style="padding:0 28px 28px;"><p style="margin:0;font-size:13px;line-height:1.5;color:#8a8a8a;">${partes.pie}</p></td></tr>`
            : ""
        }
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#5a5a5a;">TijerApp · Turnos online para barberías</p>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Asunto y cuerpo de cada mail al barbero. */
export function armarMailDeActivacion(
  tipo: Exclude<TipoDeActivacion, "aviso_fundador">,
  b: BarberiaParaActivar,
): { subject: string; html: string } {
  const base = siteUrl();
  const nombre = escapar(b.nombre);
  const reservas = urlDeReservas(base, b.slug);
  const compartir = `${base}/${b.slug}/admin/compartir`;
  const saludo = b.dueño?.trim() ? `Hola ${escapar(b.dueño.trim().split(/\s+/)[0])},` : "Hola,";

  if (tipo === "bienvenida") {
    return {
      subject: `${b.nombre} ya está en TijerApp`,
      html: plantilla({
        preheader: "Tu página de turnos ya está andando. Falta un paso: que tus clientes la conozcan.",
        titulo: `${nombre} ya toma turnos online`,
        parrafos: [
          `${saludo} tu página ya está andando. Cualquiera que entre a este link puede sacar turno con vos ahora mismo:`,
        ],
        bloque: { etiqueta: "Tu link de turnos", contenido: escapar(reservas) },
        boton: { texto: "Ver cómo compartirlo", href: compartir },
        pie: "Lo que falta no es configurar nada más: es que tus clientes lo conozcan. En el panel te dejamos el texto para la bio de Instagram y un cartel con QR para pegar en el espejo.",
      }),
    };
  }

  if (tipo === "dia_1") {
    return {
      subject: "El paso que te falta: tu link en la bio",
      html: plantilla({
        preheader: "Copiá esto en tu bio de Instagram y los turnos empiezan a entrar solos.",
        titulo: "Poné tu link donde te ven todos los días",
        parrafos: [
          `${saludo} ${nombre} está lista, pero todavía no entró ningún turno. Casi siempre es por lo mismo: los clientes no saben que pueden reservar solos.`,
          "El lugar que más rinde es la bio de Instagram. Copiá esto tal cual:",
        ],
        bloque: { etiqueta: "Para tu bio de Instagram", contenido: escapar(textoParaBio(reservas)) },
        boton: { texto: "Abrir mi kit para compartir", href: compartir },
        pie: "Ahí también tenés un mensaje listo para mandarles a tus clientes de siempre por WhatsApp.",
      }),
    };
  }

  if (tipo === "dia_3") {
    return {
      subject: "Un cartel para el espejo y listo",
      html: plantilla({
        preheader: "Imprimí el cartel con QR: el cliente escanea desde el sillón y reserva su próximo corte.",
        titulo: "Que reserven desde el sillón",
        parrafos: [
          `${saludo} el mejor momento para que un cliente saque su próximo turno es cuando lo tenés sentado adelante.`,
          `Te armamos un cartel con el QR de ${nombre}: lo imprimís, lo pegás en el espejo y el cliente lo escanea mientras le cortás.`,
          "Y si querés arrancar hoy, mandales este mensaje a tus clientes de siempre:",
        ],
        bloque: {
          etiqueta: "Para mandar por WhatsApp",
          contenido: escapar(mensajeParaClientes(b.nombre, reservas)),
        },
        boton: { texto: "Imprimir mi cartel", href: compartir },
      }),
    };
  }

  // dia_7
  const restantes = b.diasDePruebaRestantes;
  const prueba =
    typeof restantes === "number" && restantes > 0
      ? `Te quedan ${restantes} ${restantes === 1 ? "día" : "días"} de prueba gratis.`
      : "Tu prueba gratis sigue activa.";
  return {
    subject: "¿Te doy una mano con los primeros turnos?",
    html: plantilla({
      preheader: "Si algo no te cierra o no sabés por dónde arrancar, escribime y lo vemos juntos.",
      titulo: "¿Lo ponemos a andar juntos?",
      parrafos: [
        `${saludo} pasó una semana y ${nombre} todavía no recibió su primer turno. ${prueba}`,
        "Si algo no te cerró, si no sabés por dónde arrancar o si preferís que lo dejemos armado en diez minutos por WhatsApp, escribime. Te contesto yo, no un bot.",
      ],
      boton: {
        texto: "Escribirme por WhatsApp",
        href: founderWaLink(`Hola, soy de ${b.nombre}. Quiero una mano para arrancar con TijerApp.`),
      },
      pie: `Tu link sigue siendo este: ${escapar(reservas)}`,
    }),
  };
}

/**
 * Anota y manda un mail de activación. Devuelve qué pasó.
 *
 * **Reclamar antes de mandar**: primero el renglón en el registro, y solo si
 * entra, el mail. El índice único (barbería, tipo) impide el doble envío, y si
 * la tabla no existe (migración sin correr) el insert falla y no sale nada.
 */
export async function reclamarYMandar(
  supabase: Supabase,
  slug: string,
  tipo: TipoDeActivacion,
  mail: { to: string; subject: string; html: string },
): Promise<"enviado" | "ya estaba" | "sin registro" | "fallo"> {
  const { error: reclamoError } = await supabase
    .from("barbershop_activation_log" as never)
    .insert({ barbershop_slug: slug, kind: tipo, status: "sent" } as never);

  if (reclamoError) {
    // 23505 = otra pasada llegó antes.
    if (reclamoError.code === "23505") return "ya estaba";
    Sentry.captureException(reclamoError, {
      tags: { origen: "activacion", paso: "reclamar", tipo },
    });
    return "sin registro";
  }

  const fallar = async (motivo: string) => {
    await supabase
      .from("barbershop_activation_log" as never)
      .update({ status: "failed", error_message: motivo } as never)
      .eq("barbershop_slug", slug)
      .eq("kind", tipo)
      .eq("status", "sent");
    return "fallo" as const;
  };

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return fallar("RESEND_API_KEY no configurada");

  try {
    const resend = new Resend(resendKey);
    // Resend no tira excepción cuando rechaza un mail: devuelve `error`.
    const { error } = await resend.emails.send({
      from: resolveEmailFrom(),
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      // Único por mail, para que Gmail no los junte ni esconda lo repetido.
      headers: { "X-Entity-Ref-ID": randomUUID() },
    });
    if (error) {
      Sentry.captureException(new Error(`Resend: ${error.message}`), {
        tags: { origen: "activacion", tipo },
      });
      return fallar(error.message);
    }
    return "enviado";
  } catch (error) {
    Sentry.captureException(error, { tags: { origen: "activacion", tipo } });
    return fallar(error instanceof Error ? error.message : "error desconocido");
  }
}

/** La bienvenida, al terminar el registro. Nunca tira: es un extra del alta. */
export async function mandarBienvenida(b: BarberiaParaActivar): Promise<void> {
  try {
    const mail = armarMailDeActivacion("bienvenida", b);
    await reclamarYMandar(getSupabaseAdminClient(), b.slug, "bienvenida", {
      to: b.email,
      ...mail,
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { origen: "activacion", tipo: "bienvenida" } });
  }
}

/** El aviso interno del día 3: para que el fundador le escriba él. */
export function armarAvisoAlFundador(entrada: {
  nombre: string;
  slug: string;
  dias: number;
  whatsappLink: string | null;
  whatsapp: string | null;
}): { subject: string; html: string } {
  const nombre = escapar(entrada.nombre);
  const pagina = `${siteUrl()}/${entrada.slug}`;
  const contacto = entrada.whatsappLink
    ? `<a href="${entrada.whatsappLink}" style="color:#8a7433">${escapar(entrada.whatsapp ?? "WhatsApp")}</a>`
    : escapar(entrada.whatsapp ?? "sin WhatsApp cargado");
  return {
    subject: `TijerApp · ${entrada.nombre} lleva ${entrada.dias} días sin un turno`,
    html: `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;color:#111">
      <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a7433;margin:0 0 4px">TijerApp</p>
      <h1 style="font-size:20px;margin:0 0 12px">${nombre} sigue en cero</h1>
      <p style="font-size:14px;line-height:1.55;margin:0 0 12px">
        Se registró hace ${entrada.dias} días y todavía no recibió ningún turno. Ya le
        mandamos los mails de activación; es el momento de escribirle vos.
      </p>
      <p style="font-size:14px;margin:0 0 6px">WhatsApp: <strong>${contacto}</strong></p>
      <p style="font-size:14px;margin:0">Su página: <a href="${pagina}" style="color:#8a7433">${escapar(pagina)}</a></p>
    </div>`,
  };
}
