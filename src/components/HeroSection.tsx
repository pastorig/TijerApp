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

type HeroSectionProps = {
  barbershop: Pick<
    DemoBarbershop,
    "name" | "description" | "slug" | "instagram"
  >;
};

export function HeroSection({ barbershop }: HeroSectionProps) {
  return (
    <section className="flex min-h-[55vh] flex-col justify-center py-10 sm:py-16 lg:min-h-[72vh] lg:py-20">
      <div className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Turnos online
        </p>

        <h1 className="mt-6 max-w-full text-[2.25rem] font-black uppercase leading-[0.95] tracking-tight text-balance break-words sm:mt-8 sm:text-6xl lg:text-7xl">
          {barbershop.name}
        </h1>

        <p className="mt-6 max-w-xl text-base leading-7 text-[color:var(--text-secondary)] sm:mt-8 sm:text-lg sm:leading-8">
          {barbershop.description}
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:mt-12 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
          <BookingCTA barbershopSlug={barbershop.slug} />
          {barbershop.instagram ? (
            <a
              href={barbershop.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
            >
              <InstagramGlyph className="size-4" />
              Instagram
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
