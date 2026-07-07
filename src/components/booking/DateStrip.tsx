"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
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
 * nativo por algo táctil e intuitivo. Se DESLIZA horizontalmente para ver más
 * días: fades dinámicos en los bordes + un chevron a la derecha señalan que hay
 * más para scrollear. Incluye un input nativo "otra fecha" para fechas más
 * lejanas que el strip.
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  // Actualiza los fades según la posición de scroll: el izquierdo aparece
  // cuando te corriste a la derecha; el derecho desaparece al llegar al final.
  function updateFades() {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  }

  useEffect(() => {
    updateFades();
    window.addEventListener("resize", updateFades);
    return () => window.removeEventListener("resize", updateFades);
    // Re-medimos si cambia la cantidad de días.
  }, [days]);

  return (
    <div>
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateFades}
          role="radiogroup"
          aria-label="Elegí el día — deslizá para ver más"
          className="-mx-1 flex snap-x scroll-smooth gap-2 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

        {/* Fade izquierdo — aparece al deslizar hacia la derecha */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black to-transparent transition-opacity duration-[var(--duration-fast)]",
            showLeftFade ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Fade derecho + chevron — señala que hay más días para deslizar */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 flex w-14 items-center justify-end bg-gradient-to-l from-black via-black/85 to-transparent pb-2 transition-opacity duration-[var(--duration-fast)]",
            showRightFade ? "opacity-100" : "opacity-0",
          )}
        >
          <ChevronRight className="size-5 animate-pulse text-[color:var(--brand-gold)]" />
        </div>
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
