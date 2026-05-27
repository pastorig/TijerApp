import { Clock, MapPin, MessageCircle } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

type BarbershopInfoSectionProps = {
  barbershop: Pick<
    DemoBarbershop,
    "whatsapp" | "instagram" | "address" | "workingHours"
  >;
};

function buildWhatsAppLink(rawNumber: string): string | null {
  const digits = rawNumber.replace(/\D+/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function buildMapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address,
  )}`;
}

export function BarbershopInfoSection({
  barbershop,
}: BarbershopInfoSectionProps) {
  const whatsappLink = barbershop.whatsapp
    ? buildWhatsAppLink(barbershop.whatsapp)
    : null;
  const mapsLink = barbershop.address
    ? buildMapsLink(barbershop.address)
    : null;

  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12">
        <header className="text-center sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Información
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Cómo encontrarnos
          </h2>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {/* Horario */}
          <article className="flex items-start gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5">
            <div
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
            >
              <Clock className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Horario base
              </p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-white">
                {barbershop.workingHours.start} – {barbershop.workingHours.end}
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Cada barbero puede tener su propio horario semanal.
              </p>
            </div>
          </article>

          {/* Dirección */}
          {barbershop.address && mapsLink ? (
            <article className="flex items-start gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5">
              <div
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
              >
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Dirección
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {barbershop.address}
                </p>
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold-hi)]"
                >
                  Ver en Google Maps →
                </a>
              </div>
            </article>
          ) : null}

          {/* WhatsApp */}
          {whatsappLink ? (
            <article className="flex items-start gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5">
              <div
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--success)]/30 bg-[color:var(--success-soft)] text-[color:var(--success)]"
              >
                <MessageCircle className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  WhatsApp
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-white">
                  {barbershop.whatsapp}
                </p>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--success)] transition-colors duration-[var(--duration-fast)] hover:opacity-80"
                >
                  Escribir →
                </a>
              </div>
            </article>
          ) : null}

          {/* Instagram */}
          {barbershop.instagram ? (
            <article className="flex items-start gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5">
              <div
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-default)] text-[color:var(--text-secondary)]"
              >
                <InstagramGlyph className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Instagram
                </p>
                <p className="mt-1 truncate text-sm font-bold text-white">
                  {barbershop.instagram.replace(
                    /^https?:\/\/(www\.)?instagram\.com\//,
                    "@",
                  )}
                </p>
                <a
                  href={barbershop.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold-hi)]"
                >
                  Ver perfil →
                </a>
              </div>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
