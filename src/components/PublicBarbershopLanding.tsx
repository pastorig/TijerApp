import Link from "next/link";
import {
  getPublicServices,
  type DemoBarbershop,
} from "@/data/demo-barbershops";
import type { PublicReview } from "@/lib/appointment-reviews";
import { Logo } from "@/components/ui";
import { LastContextTracker } from "@/components/pwa/LastContextTracker";
import { BarbershopGallerySection } from "./BarbershopGallerySection";
import { BarbershopInfoSection } from "./BarbershopInfoSection";
import { BarbershopReviewsSection } from "./BarbershopReviewsSection";
import { BarbershopTeamSection } from "./BarbershopTeamSection";
import { HeroSection } from "./HeroSection";
import { PublicBarbershopFooter } from "./PublicBarbershopFooter";
import { ServicesSection } from "./ServicesSection";

type PublicBarbershopLandingProps = {
  barbershop: DemoBarbershop;
  reviews?: PublicReview[];
};

export function PublicBarbershopLanding({
  barbershop,
  reviews = [],
}: PublicBarbershopLandingProps) {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* PWA: registra que el usuario visitó esta barbería como "public" para
          que al abrir la PWA del home screen lo redirija acá. */}
      <LastContextTracker slug={barbershop.slug} role="public" />

      {/* Nav top */}
      <nav className="sticky top-0 z-10 border-b border-[color:var(--border-subtle)] bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4 lg:px-12">
          <Link
            href="/"
            aria-label="Ir al inicio de TijerApp"
            className="inline-flex"
          >
            <Logo size="sm" />
          </Link>
          <Link
            href={`/${barbershop.slug}/reservar`}
            className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]"
          >
            Reservar
          </Link>
        </div>
      </nav>

      <HeroSection barbershop={barbershop} />

      <BarbershopTeamSection
        barbershopSlug={barbershop.slug}
        fallbackBarbers={barbershop.barbers}
      />

      <ServicesSection
        services={getPublicServices(barbershop)}
        barbershopSlug={barbershop.slug}
      />

      <BarbershopGallerySection barbershopSlug={barbershop.slug} />

      {reviews.length > 0 ? (
        <BarbershopReviewsSection
          reviews={reviews}
          barbershopSlug={barbershop.slug}
          googleReviewsUrl={barbershop.googleReviewsUrl}
        />
      ) : null}

      <BarbershopInfoSection barbershop={barbershop} />

      <PublicBarbershopFooter barbershopName={barbershop.name} />
    </main>
  );
}
