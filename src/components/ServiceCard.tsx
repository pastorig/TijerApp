import type { BarbershopService } from "@/data/demo-barbershops";
import { formatPrice } from "@/lib/format";

type ServiceCardProps = {
  service: BarbershopService;
};

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="group flex items-center justify-between gap-4 py-5 transition-colors duration-[var(--duration-base)]">
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold text-white sm:text-lg">
          {service.name}
        </h3>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
          {service.durationMinutes} min
        </p>
      </div>
      <p className="shrink-0 font-mono text-xl font-bold tabular-nums text-[color:var(--brand-gold)] sm:text-2xl">
        {formatPrice(service.price)}
      </p>
    </article>
  );
}
