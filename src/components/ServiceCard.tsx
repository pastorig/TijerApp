import type { BarbershopService } from "@/data/demo-barbershops";
import { formatPrice } from "@/lib/format";

type ServiceCardProps = {
  service: BarbershopService;
};

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="flex items-center justify-between gap-4 border-b border-stone-800 py-5 last:border-b-0">
      <div>
        <h3 className="text-lg font-semibold text-stone-100">
          {service.name}
        </h3>
        <p className="mt-1 text-sm text-stone-400">
          {service.durationMinutes} minutos
        </p>
      </div>
      <p className="font-mono text-xl font-bold text-amber-300">
        {formatPrice(service.price)}
      </p>
    </article>
  );
}
