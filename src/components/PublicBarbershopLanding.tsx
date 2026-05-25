import Link from "next/link";
import {
  getPublicServices,
  type DemoBarbershop,
} from "@/data/demo-barbershops";
import { Logo } from "@/components/ui";
import { HeroSection } from "./HeroSection";
import { ServicesSection } from "./ServicesSection";

type PublicBarbershopLandingProps = {
  barbershop: DemoBarbershop;
};

export function PublicBarbershopLanding({
  barbershop,
}: PublicBarbershopLandingProps) {
  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <Link
          href="/"
          className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:tracking-[0.2em]"
        >
          ← BarberSync
        </Link>
        <Logo variant="mark" size="sm" className="shrink-0" />
      </nav>

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pb-28">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-20">
          <HeroSection barbershop={barbershop} />
          <ServicesSection
            services={getPublicServices(barbershop)}
            workingHours={barbershop.workingHours}
          />
        </div>
      </div>
    </main>
  );
}
