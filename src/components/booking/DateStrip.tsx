"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
 * nativo por algo táctil e intuitivo. Se navega deslizando (touch) o con las
 * FLECHAS ubicadas a los costados — por fuera de los recuadros, así no pisan
 * ningún día. Las flechas se deshabilitan al llegar a cada extremo. En mobile
 * un texto refuerza que se puede deslizar. Incluye un input nativo "otra fecha"
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Recalcula si se puede scrollear hacia cada lado (para habilitar/atenuar
  // las flechas en los extremos).
  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  }

  // Desplaza ~75% del viewport visible en la dirección indicada (-1 izq, 1 der).
  function scrollByDir(dir: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(180, el.clientWidth * 0.75),
      behavior: "smooth",
    });
  }

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
    // Re-medimos si cambia la cantidad de días.
  }, [days]);

  const arrowBase =
    "flex w-9 shrink-0 items-center justify-center self-stretch rounded-[var(--radius-md)] border transition-colors duration-[var(--duration-fast)] press-shrink";
  const arrowEnabled =
    "border-[color:var(--border-default)] bg-[color:var(--surface-1)] text-[color:var(--brand-gold)] hover:border-[color:var(--brand-gold)] hover:bg-[color:var(--brand-gold-soft)]";
  const arrowDisabled =
    "cursor-not-allowed border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] text-[color:var(--text-subtle)] opacity-40";

  return (
    <div>
      <div className="flex items-stretch gap-2">
        {/* Flecha izquierda — fuera de los recuadros */}
        <button
          type="button"
          aria-label="Ver días anteriores"
          onClick={() => scrollByDir(-1)}
          disabled={disabled || !canScrollLeft}
          className={cn(
            arrowBase,
            !disabled && canScrollLeft ? arrowEnabled : arrowDisabled,
          )}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>

        {/* Pills deslizables */}
        <div
          ref={scrollRef}
          onScroll={updateArrows}
          role="radiogroup"
          aria-label="Elegí el día"
          className="flex min-w-0 flex-1 snap-x scroll-smooth gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
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

        {/* Flecha derecha — fuera de los recuadros */}
        <button
          type="button"
          aria-label="Ver días siguientes"
          onClick={() => scrollByDir(1)}
          disabled={disabled || !canScrollRight}
          className={cn(
            arrowBase,
            !disabled && canScrollRight ? arrowEnabled : arrowDisabled,
          )}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {/* Hint mobile: deslizá (en desktop se entiende con las flechas + mouse) */}
        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)] sm:hidden">
          <ChevronLeft className="size-3 text-[color:var(--brand-gold)]" aria-hidden="true" />
          Deslizá para ver más días
          <ChevronRight className="size-3 text-[color:var(--brand-gold)]" aria-hidden="true" />
        </p>

        {/* Otra fecha (más lejana que el strip) */}
        <label className="flex items-center gap-2 text-[11px] text-[color:var(--text-muted)]">
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
    </div>
  );
}
