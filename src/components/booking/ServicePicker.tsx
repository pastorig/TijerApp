"use client";

import { motion } from "framer-motion";
import { Clock, Scissors } from "lucide-react";
import { type BarberService } from "@/data/demo-barbershops";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { FondoElegido, TARJETA_ELEGIBLE, TildeElegido } from "./BookingMotion";

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
      className="grid grid-cols-1 gap-2.5"
    >
      {services.map((service) => {
        const isSelected = service.id === selectedId;
        return (
          <motion.button
            key={service.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(service.id)}
            {...TARJETA_ELEGIBLE.gestos(Boolean(disabled))}
            className={cn(
              TARJETA_ELEGIBLE.base,
              "px-3.5 py-3",
              isSelected ? TARJETA_ELEGIBLE.elegida : TARJETA_ELEGIBLE.libre,
            )}
          >
            {isSelected ? <FondoElegido grupo="servicio" /> : null}
            <span className={TARJETA_ELEGIBLE.brillo} aria-hidden="true" />
            <span
              aria-hidden="true"
              className={cn(
                "relative flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                isSelected
                  ? "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold)]/15 text-[color:var(--brand-gold)] shadow-[0_0_18px_-6px_rgba(201,162,62,0.7)]"
                  : "border-[color:var(--border-default)] bg-[color:var(--surface-2)] text-[color:var(--text-muted)]",
              )}
            >
              <Scissors className="size-4" />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">
                {service.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[color:var(--text-muted)]">
                <Clock className="size-3" aria-hidden="true" />
                {service.durationMinutes} min
              </span>
            </span>
            <span className="relative shrink-0 text-right">
              <span className="block font-mono text-base font-black tabular-nums text-[color:var(--brand-gold)]">
                {formatPrice(service.price)}
              </span>
              {isSelected ? <TildeElegido className="ml-auto mt-0.5" /> : null}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
