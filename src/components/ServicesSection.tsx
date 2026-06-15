import type {
  BarbershopService,
} from "@/data/demo-barbershops";
import { formatPrice } from "@/lib/format";
import { BookingCTA } from "./BookingCTA";

type ServicesSectionProps = {
  services: BarbershopService[];
  barbershopSlug: string;
};

export function ServicesSection({
  services,
  barbershopSlug,
}: ServicesSectionProps) {
  if (services.length === 0) return null;

  return (
    <section
      id="servicios"
      className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <header className="text-center sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Servicios
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:mt-4 sm:text-3xl lg:text-4xl">
            Elegí tu servicio
          </h2>
        </header>

        <ul className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li
              key={service.id}
              className="group flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)]/40"
            >
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-white sm:text-lg">
                  {service.name}
                </h3>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                  {service.durationMinutes} min
                </p>
              </div>
              <p className="shrink-0 font-mono text-xl font-bold tabular-nums text-[color:var(--brand-gold)] sm:text-2xl">
                {formatPrice(service.price)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-center sm:justify-start">
          <BookingCTA barbershopSlug={barbershopSlug} />
        </div>
      </div>
    </section>
  );
}
