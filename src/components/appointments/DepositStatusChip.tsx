import { cn } from "@/lib/cn";

/**
 * El estado de la seña de un turno.
 *
 * Lo comparten el turnero del dueño y la agenda del empleado (feature 021).
 * Vivía adentro de `AppointmentRow` y el empleado no lo tenía, aunque su
 * endpoint ya traía el dato: el que recibe al cliente en la puerta es
 * justamente el que necesita saber si pagó.
 *
 * Un estado que no está en la tabla no dibuja nada, a propósito: si mañana
 * MercadoPago agrega uno, es mejor que no aparezca un chip a que aparezca uno
 * en blanco o con el nombre crudo del estado.
 */
const META: Record<string, { label: string; classes: string }> = {
  pending: {
    label: "Seña pendiente",
    classes:
      "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
  },
  paid: {
    label: "Seña pagada",
    classes:
      "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]",
  },
  expired: {
    label: "Seña vencida",
    classes:
      "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  },
  failed: {
    label: "Seña rechazada",
    classes:
      "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  },
};

export function DepositStatusChip({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const m = META[status];
  if (!m) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
        m.classes,
        className,
      )}
    >
      {m.label}
    </span>
  );
}
