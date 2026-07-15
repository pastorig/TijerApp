import { CalendarDays, TrendingUp } from "lucide-react";
import { VizAgenda } from "./FeatureVisuals";

/**
 * HeroShowcase — cluster de "mini dashboard" flotante para el hero de la home.
 * Compone la mini-agenda + KPIs + un panel de ingresos superpuesto para dar
 * sensación de producto real. Server-safe (solo composición visual).
 */
export function HeroShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* Halo dorado detrás del cluster */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 -z-10"
        style={{
          background:
            "radial-gradient(60% 55% at 60% 40%, rgba(201,162,62,0.18), transparent 70%)",
        }}
      />

      {/* Panel principal: turnero de hoy */}
      <div className="card-premium p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
            >
              <CalendarDays className="size-4" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                Turnero de hoy
              </p>
              <p className="text-[9px] text-[color:var(--text-muted)]">
                2 barberos · en vivo
              </p>
            </div>
          </div>
          <span className="chip-gold !px-2 !py-1 !text-[8px]">
            <span className="dot-gold-pulse" />
            Live
          </span>
        </div>

        <div className="mt-3">
          <VizAgenda />
        </div>

        {/* KPIs mini */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-2)]/50 p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              Turnos hoy
            </p>
            <p className="mt-0.5 text-xl font-black leading-none text-white">
              24
            </p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-2)]/50 p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              Ocupación
            </p>
            <p className="mt-0.5 text-xl font-black leading-none text-gold-gradient">
              82%
            </p>
          </div>
        </div>
      </div>

      {/* Panel flotante: ingresos (superpuesto, solo sm+) */}
      <div className="card-premium card-premium-glow absolute -bottom-8 -left-4 hidden w-52 p-3 sm:block">
        <div className="flex items-center justify-between">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Ingresos · 7 días
          </p>
          <TrendingUp
            aria-hidden="true"
            className="size-3 text-[color:var(--success)]"
          />
        </div>
        <p className="mt-0.5 text-lg font-black leading-none text-gold-gradient">
          $284.500
        </p>
        <div className="mt-2 flex h-8 items-end gap-1">
          {[38, 52, 44, 68, 60, 82, 74].map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[2px]"
              style={{
                height: `${v}%`,
                backgroundImage:
                  i === 6
                    ? "linear-gradient(180deg, var(--brand-gold-hi), var(--brand-gold-lo))"
                    : "linear-gradient(180deg, rgba(201,162,62,0.5), rgba(138,110,37,0.2))",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
