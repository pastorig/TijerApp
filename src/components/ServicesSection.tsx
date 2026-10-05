import type {
  BarbershopService,
} from "@/data/demo-barbershops";
import { formatPrice } from "@/lib/format";
import { BookingCTA } from "./BookingCTA";
import { Brillo, Escalera, Peldano } from "@/components/public/LandingMotion";

type ServicesSectionProps = {
  services: BarbershopService[];
  barbershopSlug: string;
  /**
   * False en modo lectura (plan vencido): la lista de servicios y precios se
   * sigue mostrando, pero sin el CTA de reservar.
   * Ver specs/009-modo-lectura/spec.md.
   */
  bookingEnabled?: boolean;
};

export function ServicesSection({
  services,
  barbershopSlug,
  bookingEnabled = true,
}: ServicesSectionProps) {
  if (services.length === 0) return null;

  return (
    <section
      id="servicios"
      className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <Escalera as="header" paso={0.09} className="text-center sm:text-left">
          <Peldano as="p" className="text-xs font-semibold uppercase tracking-normal text-[color:var(--brand-gold)]">
            Servicios
          </Peldano>
          <Peldano as="h2" className="mt-3 text-2xl font-black uppercase tracking-normal text-white sm:mt-4 sm:text-3xl lg:text-4xl">
            Elegí tu servicio
          </Peldano>
        </Escalera>

        <Escalera paso={0.06} className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Peldano
              key={service.id}
              levanta
              className="group relative flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)]/40"
            >
              <Brillo />
              <div className="relative min-w-0">
                <h3 className="truncate text-base font-bold text-white sm:text-lg">
                  {service.name}
                </h3>
                <p className="mt-1 font-mono text-xs uppercase tracking-normal text-[color:var(--text-muted)]">
                  {service.durationMinutes} min
                </p>
              </div>
              <p className="relative shrink-0 origin-right font-mono text-xl font-bold tabular-nums text-[color:var(--brand-gold)] transition-transform duration-[var(--duration-base)] ease-out group-hover:scale-110 sm:text-2xl">
                {formatPrice(service.price)}
              </p>
            </Peldano>
          ))}
        </Escalera>

        {bookingEnabled ? (
          <div className="mt-8 flex justify-center sm:justify-start">
            <BookingCTA barbershopSlug={barbershopSlug} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
