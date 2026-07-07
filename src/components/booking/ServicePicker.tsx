import { Check, Clock, Scissors } from "lucide-react";
import { type BarberService } from "@/data/demo-barbershops";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

type ServicePickerProps = {
  services: BarberService[];
  selectedId: string;
  disabled?: boolean;
  onSelect: (serviceId: string) => void;
};

/**
 * Selección de servicio como tarjetas: ícono + nombre + duración + precio.
 * Reemplaza el <select> "Corte — $8.500" por algo que se lee de un vistazo.
 */
export function ServicePicker({
  services,
  selectedId,
  disabled,
  onSelect,
}: ServicePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Elegí el servicio"
      className="grid gap-2.5"
    >
      {services.map((service) => {
        const isSelected = service.id === selectedId;
        return (
          <button
            key={service.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(service.id)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-3 text-left transition-colors duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-60",
              isSelected
                ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] ring-1 ring-[color:var(--brand-gold)]/25"
                : "border-[color:var(--border-default)] bg-[color:var(--surface-1)] hover:border-[color:var(--brand-gold)]/50",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                isSelected
                  ? "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold)]/15 text-[color:var(--brand-gold)]"
                  : "border-[color:var(--border-default)] bg-[color:var(--surface-2)] text-[color:var(--text-muted)]",
              )}
            >
              <Scissors className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">
                {service.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[color:var(--text-muted)]">
                <Clock className="size-3" aria-hidden="true" />
                {service.durationMinutes} min
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-base font-black tabular-nums text-[color:var(--brand-gold)]">
                {formatPrice(service.price)}
              </span>
              {isSelected ? (
                <Check
                  className="ml-auto mt-0.5 size-4 text-[color:var(--brand-gold)]"
                  aria-hidden="true"
                />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
