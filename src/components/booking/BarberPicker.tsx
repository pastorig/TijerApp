import { Check } from "lucide-react";
import {
  getBarberDisplayName,
  type Barber,
} from "@/data/demo-barbershops";
import { cn } from "@/lib/cn";
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
      className="grid gap-2.5 sm:grid-cols-2"
    >
      {barbers.map((barber) => {
        const name = getBarberDisplayName(barber);
        const isSelected = barber.id === selectedId;
        return (
          <button
            key={barber.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(barber.id)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-60",
              isSelected
                ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] ring-1 ring-[color:var(--brand-gold)]/25"
                : "border-[color:var(--border-default)] bg-[color:var(--surface-1)] hover:border-[color:var(--brand-gold)]/50",
            )}
          >
            <InitialsAvatar name={name} active={isSelected} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-white">
                {name}
              </span>
              {barber.role ? (
                <span className="block truncate text-[11px] text-[color:var(--text-muted)]">
                  {barber.role}
                </span>
              ) : null}
            </span>
            {isSelected ? (
              <Check
                className="size-4 shrink-0 text-[color:var(--brand-gold)]"
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
