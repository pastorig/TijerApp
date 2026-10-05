"use client";

import { motion } from "framer-motion";
import {
  getBarberDisplayName,
  type Barber,
} from "@/data/demo-barbershops";
import { cn } from "@/lib/cn";
import { FondoElegido, TARJETA_ELEGIBLE, TildeElegido } from "./BookingMotion";
import { InitialsAvatar } from "./InitialsAvatar";

type BarberPickerProps = {
  barbers: Barber[];
  selectedId: string;
  disabled?: boolean;
  onSelect: (barberId: string) => void;
};

/**
 * Selección de barbero como tarjetas con avatar (en vez de un <select> gris).
 * Más visual y táctil. Si hay un solo barbero, el llamador puede mostrar un
 * display simple en vez de este picker.
 */
export function BarberPicker({
  barbers,
  selectedId,
  disabled,
  onSelect,
}: BarberPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Elegí tu barbero"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
    >
      {barbers.map((barber) => {
        const name = getBarberDisplayName(barber);
        const isSelected = barber.id === selectedId;
        return (
          <motion.button
            key={barber.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(barber.id)}
            {...TARJETA_ELEGIBLE.gestos(Boolean(disabled))}
            className={cn(
              TARJETA_ELEGIBLE.base,
              "px-3 py-2.5",
              isSelected ? TARJETA_ELEGIBLE.elegida : TARJETA_ELEGIBLE.libre,
            )}
          >
            {isSelected ? <FondoElegido grupo="barbero" /> : null}
            <span className={TARJETA_ELEGIBLE.brillo} aria-hidden="true" />
            <InitialsAvatar name={name} active={isSelected} className="relative" />
            <span className="relative min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">
                {name}
              </span>
              {barber.role ? (
                <span className="block truncate text-[11px] text-[color:var(--text-muted)]">
                  {barber.role}
                </span>
              ) : null}
            </span>
            {isSelected ? <TildeElegido className="relative shrink-0" /> : null}
          </motion.button>
        );
      })}
    </div>
  );
}
