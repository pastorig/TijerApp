"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";
import { Copy, ExternalLink, MessageCircle, Printer } from "lucide-react";
import { useToast } from "@/components/ui";
import { mensajeParaClientes, textoParaBio, urlDeReservas } from "@/lib/activacion";
import { whatsAppShareLink } from "@/lib/whatsapp";

/**
 * "Compartir" (feature 034): todo lo que hace falta para poner el link de la
 * barbería delante de sus clientes.
 *
 * Existe porque las barberías que se registraron y nunca tuvieron un turno
 * habían dejado todo configurado: lo único que no pasó fue que alguien
 * compartiera el link. Acá está el link, el QR, el texto para la bio y el
 * mensaje para WhatsApp, cada uno a un toque, y un cartel para imprimir.
 */

/** El QR como matriz de módulos; se dibuja en SVG para que imprima nítido. */
function matrizQr(texto: string): boolean[][] {
  // Nivel M: aguanta que el cartel se arrugue o le dé un reflejo, sin volverse
  // tan denso que cueste escanearlo desde el sillón.
  const qr = qrcode(0, "M");
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, fila) =>
    Array.from({ length: n }, (_, col) => qr.isDark(fila, col)),
  );
}

function Qr({ texto, className }: { texto: string; className?: string }) {
  const matriz = useMemo(() => matrizQr(texto), [texto]);
  const n = matriz.length;
  const margen = 2;
  const lado = n + margen * 2;
  // Un solo path: miles de <rect> hacen pesado el DOM y dejan líneas al imprimir.
  const d = matriz
    .flatMap((fila, y) =>
      fila.map((oscuro, x) => (oscuro ? `M${x + margen} ${y + margen}h1v1h-1z` : "")),
    )
    .join("");
  return (
    <svg
      viewBox={`0 0 ${lado} ${lado}`}
      role="img"
      aria-label="Código QR de tu página de reservas"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={lado} height={lado} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}

export function ShareKit({
  barbershopName,
  barbershopSlug,
  siteUrl,
}: {
  barbershopName: string;
  barbershopSlug: string;
  siteUrl: string;
}) {
  const toast = useToast();
  const reservas = urlDeReservas(siteUrl, barbershopSlug);
  const bio = textoParaBio(reservas);
  const mensaje = mensajeParaClientes(barbershopName, reservas);
  const linkCorto = reservas.replace(/^https?:\/\//, "");

  async function copiar(texto: string, queEs: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${queEs} copiado`);
    } catch {
      toast.error("No pudimos copiarlo. Seleccionalo y copialo a mano.");
    }
  }

  const botonSecundario =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-default)] px-4 text-xs font-semibold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--brand-gold-ring)] hover:text-white";
  const botonPrincipal =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-gold-grad px-4 text-xs font-bold text-black";
  const etiqueta =
    "text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]";

  return (
    <>
      <div className="flex flex-col gap-6">
        <header className="animate-fade-up">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
            Compartir
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
            Que te encuentren
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
            Tu página ya toma turnos. Lo que falta es que tus clientes la conozcan:
            ponela en tu Instagram, mandásela por WhatsApp y pegá el cartel en el espejo.
          </p>
        </header>

        <section
          aria-label="Tu link de turnos"
          className="card-premium flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="min-w-0">
            <p className={etiqueta}>Tu link de turnos</p>
            <p className="mt-1 break-all text-sm font-semibold text-white">{linkCorto}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => copiar(reservas, "Link")} className={botonPrincipal}>
              <Copy aria-hidden="true" className="size-4" />
              Copiar link
            </button>
            <a href={reservas} target="_blank" rel="noopener noreferrer" className={botonSecundario}>
              <ExternalLink aria-hidden="true" className="size-4" />
              Abrir
            </a>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section
            aria-label="Para tu bio de Instagram"
            className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 sm:p-5"
          >
            <p className={etiqueta}>Para tu bio de Instagram</p>
            <p className="whitespace-pre-line rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] px-3 py-3 text-sm leading-6 text-white">
              {bio}
            </p>
            <p className="text-xs leading-5 text-[color:var(--text-muted)]">
              Es el lugar que más rinde: el que te sigue ya te conoce, solo le falta
              el link.
            </p>
            <div>
              <button type="button" onClick={() => copiar(bio, "Texto")} className={botonSecundario}>
                <Copy aria-hidden="true" className="size-4" />
                Copiar texto
              </button>
            </div>
          </section>

          <section
            aria-label="Para tus clientes de siempre"
            className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 sm:p-5"
          >
            <p className={etiqueta}>Para tus clientes de siempre</p>
            <p className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] px-3 py-3 text-sm leading-6 text-white">
              {mensaje}
            </p>
            <p className="text-xs leading-5 text-[color:var(--text-muted)]">
              Mandáselo a los que ya te escriben para pedir turno, o subilo a tu
              estado.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={whatsAppShareLink(mensaje)}
                target="_blank"
                rel="noopener noreferrer"
                className={botonSecundario}
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                Mandar por WhatsApp
              </a>
              <button type="button" onClick={() => copiar(mensaje, "Mensaje")} className={botonSecundario}>
                <Copy aria-hidden="true" className="size-4" />
                Copiar
              </button>
            </div>
          </section>
        </div>

        <section
          aria-label="Cartel con QR"
          className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
        >
          <Qr texto={reservas} className="size-36 shrink-0 rounded-[var(--radius-sm)]" />
          <div className="flex min-w-0 flex-col gap-3">
            <p className={etiqueta}>Cartel para el espejo</p>
            <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
              El mejor momento para que un cliente saque su próximo turno es cuando
              lo tenés sentado adelante. Imprimí el cartel, pegalo en el espejo y que
              lo escanee mientras le cortás.
            </p>
            <div>
              <button type="button" onClick={() => window.print()} className={botonPrincipal}>
                <Printer aria-hidden="true" className="size-4" />
                Imprimir cartel
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* El cartel: no se ve en pantalla, es lo ÚNICO que sale al imprimir. */}
      <div className="tj-cartel" aria-hidden="true">
        <p className="tj-cartel-marca">{barbershopName}</p>
        <p className="tj-cartel-titulo">Sacá tu turno online</p>
        <p className="tj-cartel-bajada">Escaneá el código con la cámara del celu</p>
        <Qr texto={reservas} className="tj-cartel-qr" />
        <p className="tj-cartel-link">{linkCorto}</p>
        <p className="tj-cartel-pie">Elegís día y horario en un minuto, sin esperar respuesta</p>
      </div>
    </>
  );
}
