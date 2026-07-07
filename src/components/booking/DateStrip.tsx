import { cn } from "@/lib/cn";

const WEEKDAY_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"] as const;
const MONTH_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

/** Suma `n` días a un YYYY-MM-DD (construcción local, sin drift de timezone). */
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

type DateStripProps = {
  /** Fecha seleccionada (YYYY-MM-DD). */
  value: string;
  /** Primer día del strip = hoy (YYYY-MM-DD). También es el mínimo. */
  today: string;
  disabled?: boolean;
  /** Cantidad de días a mostrar. Default 14. */
  days?: number;
  onChange: (ymd: string) => void;
};

/**
 * Tira horizontal de días como pills ("JUE 18"). Reemplaza el input de fecha
 * nativo por algo táctil e intuitivo. Incluye un input nativo "otra fecha"
 * para fechas más lejanas que el strip.
 */
export function DateStrip({
  value,
  today,
  disabled,
  days = 14,
  onChange,
}: DateStripProps) {
  const list = Array.from({ length: days }, (_, i) => addDays(today, i));
  const beyondStrip = value && !list.includes(value);

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Elegí el día"
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2"
      >
        {list.map((ymd, i) => {
          const [, mm, dd] = ymd.split("-");
          const wd = new Date(
            Number(ymd.slice(0, 4)),
            Number(mm) - 1,
            Number(dd),
          ).getDay();
          const isSelected = ymd === value;
          const label = i === 0 ? "HOY" : i === 1 ? "MAÑ" : WEEKDAY_SHORT[wd];
          return (
            <button
              key={ymd}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(ymd)}
              className={cn(
                "flex min-h-16 w-14 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] border transition-colors duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-60",
                isSelected
                  ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
                  : "border-[color:var(--border-default)] bg-[color:var(--surface-1)] text-white hover:border-[color:var(--brand-gold)]/50",
              )}
            >
              <span
                className={cn(
                  "text-[9px] font-bold uppercase tracking-[0.1em]",
                  isSelected
                    ? "text-black/70"
                    : "text-[color:var(--text-muted)]",
                )}
              >
                {label}
              </span>
              <span className="font-mono text-lg font-black tabular-nums leading-none">
                {Number(dd)}
              </span>
              <span
                className={cn(
                  "text-[9px] font-semibold uppercase",
                  isSelected
                    ? "text-black/60"
                    : "text-[color:var(--text-subtle)]",
                )}
              >
                {MONTH_SHORT[Number(mm) - 1]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Otra fecha (más lejana que el strip) */}
      <label className="mt-2 flex items-center gap-2 text-[11px] text-[color:var(--text-muted)]">
        <span>¿Otra fecha?</span>
        <input
          type="date"
          value={beyondStrip ? value : ""}
          min={today}
          disabled={disabled}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="min-h-9 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-2 text-xs text-white outline-none focus:border-[color:var(--brand-gold)]"
        />
      </label>
    </div>
  );
}
