import Image from "next/image";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { BookingCTA } from "./BookingCTA";

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

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.498 14.382c-.301-.15-1.767-.872-2.04-.972-.273-.101-.473-.15-.672.15-.198.302-.771.973-.945 1.172-.173.2-.347.226-.646.075-.3-.15-1.267-.466-2.41-1.486-.892-.795-1.494-1.78-1.668-2.08-.173-.301-.018-.464.131-.612.135-.135.301-.347.451-.521.151-.174.2-.298.301-.498.099-.198.05-.371-.025-.521-.075-.149-.672-1.617-.92-2.21-.242-.582-.487-.5-.672-.51-.173-.008-.371-.01-.57-.01a1.099 1.099 0 0 0-.797.371c-.273.298-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.197 2.095 3.196 5.075 4.485.71.305 1.262.487 1.694.626.711.226 1.358.193 1.869.117.571-.085 1.768-.722 2.016-1.421.248-.7.248-1.298.173-1.421-.074-.124-.272-.198-.572-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

type HeroSectionProps = {
  barbershop: Pick<
    DemoBarbershop,
    "name" | "description" | "slug" | "instagram" | "whatsapp" | "logoUrl"
  >;
  /**
   * False cuando la barbería quedó en modo lectura (plan vencido): se cae el
   * CTA de reservar y WhatsApp pasa a ser la acción principal, que es el
   * camino que le queda al cliente. Ver specs/009-modo-lectura/spec.md.
   */
  bookingEnabled?: boolean;
};

function buildWhatsAppLink(rawNumber: string): string | null {
  const digits = rawNumber.replace(/\D+/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function HeroSection({
  barbershop,
  bookingEnabled = true,
}: HeroSectionProps) {
  const whatsappLink = barbershop.whatsapp
    ? buildWhatsAppLink(barbershop.whatsapp)
    : null;

  return (
    <section className="relative isolate overflow-hidden">
      {/* Gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 50% at 50% 0%, color-mix(in oklab, var(--brand-gold) 10%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-px bg-[color:var(--border-subtle)]"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-12 lg:px-12 lg:pb-16 lg:pt-14">
        <div className="animate-fade-up text-center sm:text-left">
          {barbershop.logoUrl ? (
            <div className="mx-auto mb-6 flex size-24 items-center justify-center overflow-hidden rounded-full border-2 border-[color:var(--brand-gold)]/40 bg-[color:var(--surface-1)] shadow-[0_0_40px_color-mix(in_oklab,var(--brand-gold)_15%,transparent)] sm:mx-0 sm:size-28">
              <Image
                src={barbershop.logoUrl}
                alt={`Logo de ${barbershop.name}`}
                width={112}
                height={112}
                className="size-full object-cover"
                unoptimized
                priority
              />
            </div>
          ) : null}

          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Reservas online
          </p>

          <h1 className="mt-4 text-[2.25rem] font-black uppercase leading-[0.95] tracking-tight text-balance text-white sm:mt-5 sm:text-5xl lg:text-6xl">
            {barbershop.name}
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[color:var(--text-secondary)] sm:mx-0 sm:mt-5 sm:text-lg sm:leading-8">
            {barbershop.description}
          </p>

          <div className="mt-7 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-4">
            {bookingEnabled ? (
              <BookingCTA barbershopSlug={barbershop.slug} />
            ) : null}
            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  bookingEnabled
                    ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-5 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                    : "inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gold-grad px-5 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110"
                }
              >
                <WhatsAppGlyph className="size-4" />
                {bookingEnabled ? "WhatsApp" : "Pedir turno por WhatsApp"}
              </a>
            ) : null}
            {barbershop.instagram ? (
              <a
                href={barbershop.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:ml-auto"
              >
                <InstagramGlyph className="size-4" />
                Instagram
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
