import { cn } from "@/lib/cn";

type StepHeaderProps = {
  /** Número del paso (1, 2, 3…). */
  number: number;
  title: string;
  subtitle?: string;
  /** true cuando el paso ya tiene una selección hecha. */
  done?: boolean;
};

/**
 * Encabezado de paso para el flujo de reserva: número en círculo + título +
 * subtítulo opcional. Da orden y guía visual sin ser un wizard.
 */
export function StepHeader({ number, title, subtitle, done }: StepHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-black tabular-nums transition-colors",
          done
            ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
            : "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
        )}
      >
        {number}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        {subtitle ? (
          <p className="text-[11px] leading-4 text-[color:var(--text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
