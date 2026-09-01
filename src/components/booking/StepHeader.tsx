import { cn } from "@/lib/cn";

type StepHeaderProps = {
  /** Número del paso (1, 2, 3…). */
  number: number;
  title: string;
  subtitle?: string;
  /** true cuando el paso ya tiene una selección hecha. */
  done?: boolean;
  /**
   * true cuando todavía no se puede usar porque falta un paso de arriba.
   *
   * Sin esto los cuatro pasos se ven igual de disponibles, y el que baja
   * directo a la fecha no tiene forma de darse cuenta de que le falta algo.
   */
  locked?: boolean;
};

/**
 * Encabezado de paso para el flujo de reserva: número en círculo + título +
 * subtítulo opcional. Da orden y guía visual sin ser un wizard.
 */
export function StepHeader({
  number,
  title,
  subtitle,
  done,
  locked,
}: StepHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-black tabular-nums transition-colors",
          // `locked` gana sobre `done`: el paso de la fecha arranca con hoy
          // puesto, así que se pintaba como completado incluso mientras seguía
          // cerrado — justo el paso donde se pierde la gente.
          locked
            ? "border-[color:var(--border-default)] bg-[color:var(--surface-1)] text-[color:var(--text-subtle)]"
            : done
              ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
              : "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
        )}
      >
        {number}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-bold",
            locked ? "text-[color:var(--text-muted)]" : "text-white",
          )}
        >
          {title}
        </p>
        {subtitle ? (
          <p className="text-[11px] leading-4 text-[color:var(--text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
