import { cn } from "@/lib/cn";

/**
 * Charts minimalistas para el panel owner — SVG/CSS puro, sin dependencias.
 * Barras proporcionales en la paleta de marca (negro / dorado / semánticos).
 * Pensados para dar lectura "de un vistazo" a datos que hoy viven solo como
 * números (health de barberías, ranking de reservas, etc.).
 */

type Segment = {
  label: string;
  value: number;
  /** clase de fondo de la barra + del dot de la leyenda (ej. bg-[color:var(--success)]) */
  barClass: string;
  /** clase de color del número en la leyenda */
  textClass: string;
};

/**
 * Barra apilada horizontal — cada segmento ocupa un ancho proporcional a su
 * valor sobre el total. Debajo, una leyenda con el conteo de cada segmento.
 * Uso: distribución de health de barberías (activas / quiet / inactivas).
 */
export function StackedBar({
  segments,
  ariaLabel,
}: {
  segments: Segment[];
  ariaLabel: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]"
      >
        {total > 0
          ? segments.map((s) =>
              s.value > 0 ? (
                <div
                  key={s.label}
                  className={cn(
                    "h-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-soft)]",
                    s.barClass,
                  )}
                  style={{ width: `${(s.value / total) * 100}%` }}
                />
              ) : null,
            )
          : null}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <li
            key={s.label}
            className="inline-flex items-center gap-1.5 text-[11px]"
          >
            <span
              aria-hidden="true"
              className={cn("inline-block size-2 rounded-full", s.barClass)}
            />
            <span className="text-[color:var(--text-muted)]">{s.label}</span>
            <span
              className={cn("font-mono font-bold tabular-nums", s.textClass)}
            >
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Barra de proporción fina (track + fill) para embeber en filas clickeables
 * (ej. ranking de barberías). Devuelve solo el track; el ancho del fill se
 * calcula contra `max` con un mínimo visible.
 */
export function ProportionBar({
  value,
  max,
  fillClass = "bg-gold-grad",
  className,
}: {
  value: number;
  max: number;
  fillClass?: string;
  className?: string;
}) {
  const pct = max > 0 && value > 0 ? Math.max(5, (value / max) * 100) : 0;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block overflow-hidden rounded-full bg-[color:var(--surface-2)]",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-soft)]",
          fillClass,
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}
