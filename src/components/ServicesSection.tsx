import type {
  BarbershopService,
  WorkingHours,
} from "@/data/demo-barbershops";
import { ServiceCard } from "./ServiceCard";

type ServicesSectionProps = {
  services: BarbershopService[];
  workingHours: WorkingHours;
};

export function ServicesSection({
  services,
  workingHours,
}: ServicesSectionProps) {
  return (
    <section
      id="servicios"
      className="animate-fade-up sm:border-l sm:border-[color:var(--border-subtle)] sm:pl-6 lg:pl-10"
      style={{ animationDelay: "120ms" }}
    >
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Servicios
        </p>
        <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:mt-4 sm:text-3xl lg:text-4xl">
          Elegí tu turno
        </h2>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)] sm:tracking-[0.2em]">
          {workingHours.start} → {workingHours.end} · cada {workingHours.intervalMinutes}min
        </p>
      </header>

      <div className="mt-6 divide-y divide-[color:var(--border-subtle)] sm:mt-8">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  );
}
