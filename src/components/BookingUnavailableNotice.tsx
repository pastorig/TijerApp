import Link from "next/link";
import { CalendarX, MessageCircle } from "lucide-react";
import { whatsAppLinkWithMessage } from "@/lib/whatsapp";

/**
 * Pantalla que reemplaza la reserva online cuando la barbería quedó en MODO
 * LECTURA (plan vencido). Ver `specs/009-modo-lectura/spec.md`.
 *
 * Regla de tono: esto lo lee el CLIENTE de la barbería, no el barbero. NO
 * menciona planes, pagos ni vencimientos — el tema comercial es entre la
 * barbería y TijerApp, y el cliente no tiene por qué enterarse. Solo necesita
 * el camino alternativo: escribirle por WhatsApp.
 */
export function BookingUnavailableNotice({
  barbershopName,
  barbershopSlug,
  whatsapp,
}: {
  barbershopName: string;
  barbershopSlug: string;
  whatsapp: string;
}) {
  const waHref = whatsapp
    ? whatsAppLinkWithMessage(
        whatsapp,
        `¡Hola ${barbershopName}! Quería sacar un turno.`,
      )
    : null;

  return (
    <div className="mx-auto max-w-xl rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/20 bg-[color:var(--surface-1)] p-6 text-center sm:p-10">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)]">
        <CalendarX
          aria-hidden="true"
          className="size-6 text-[color:var(--brand-gold)]"
        />
      </div>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
        Reserva online pausada
      </p>
      <h1 className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-balance text-white sm:text-3xl">
        Sacá tu turno por WhatsApp
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
        {barbershopName} no está tomando reservas por acá en este momento.
        Escribiles directo y te dan el turno.
      </p>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gold-grad px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110 sm:w-auto"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            Escribir por WhatsApp
          </a>
        ) : null}
        <Link
          href={`/${barbershopSlug}`}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] sm:w-auto"
        >
          Volver
        </Link>
      </div>
    </div>
  );
}
