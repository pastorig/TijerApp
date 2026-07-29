"use client";

import { useEffect, useRef } from "react";
import { CalendarDays, TrendingUp } from "lucide-react";
import { VizAgenda } from "./FeatureVisuals";
import { HeroNotification } from "./HeroNotification";
import { useCountUp } from "./use-count-up";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
import { useScrollProgress } from "./use-scroll-progress";

const BARS = [38, 52, 44, 68, 60, 82, 74];

// Formateadores a nivel de módulo: si fueran arrows inline cambiarían de
// identidad en cada render y el efecto del contador se reiniciaría.
const formatPlain = (value: number) => String(value);
const formatPercent = (value: number) => `${value}%`;

/**
 * HeroShowcase — cluster de "mini dashboard" flotante para el hero de la home.
 * Compone la mini-agenda + KPIs + un panel de ingresos superpuesto para dar
 * sensación de producto real.
 *
 * Movimiento (feature 012): las capas se desplazan a distinta velocidad con el
 * scroll, las barras del gráfico crecen, los KPIs cuentan y entra de forma
 * cíclica una notificación de turno nuevo. Todo el contenido final ya está en el
 * marcado servido: las animaciones lo sobrescriben después de montar, nunca
 * antes.
 */
export function HeroShowcase() {
  const rootRef = useScrollProgress<HTMLDivElement>({ mode: "away" });
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const appointmentsRef = useCountUp<HTMLParagraphElement>(24, {
    format: formatPlain,
  });
  const occupancyRef = useCountUp<HTMLParagraphElement>(82, {
    format: formatPercent,
  });
  const prefersReducedMotion = usePrefersReducedMotion();

  // Tilt sutil siguiendo el puntero. Solo se registra si hay puntero fino
  // (mouse de verdad): en táctil no se escucha nada y el cluster queda neutro.
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const root = rootRef.current;
    const tilt = tiltRef.current;
    if (!root || !tilt) return;

    let frame = 0;
    let rotateX = 0;
    let rotateY = 0;

    const apply = () => {
      frame = 0;
      tilt.style.setProperty("--tilt-x", rotateX.toFixed(2));
      tilt.style.setProperty("--tilt-y", rotateY.toFixed(2));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onMove = (event: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dx = (event.clientX - rect.left) / rect.width - 0.5;
      const dy = (event.clientY - rect.top) / rect.height - 0.5;
      rotateY = dx * 5;
      rotateX = -dy * 4;
      schedule();
    };
    const onLeave = () => {
      rotateX = 0;
      rotateY = 0;
      schedule();
    };

    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [prefersReducedMotion, rootRef]);

  return (
    <div
      ref={rootRef}
      className="relative mx-auto w-full max-w-md lg:max-w-none"
      style={{ perspective: "1200px" }}
    >
      <div
        ref={tiltRef}
        className="relative"
        style={{
          transform:
            "rotateX(calc(var(--tilt-x, 0) * 1deg)) rotateY(calc(var(--tilt-y, 0) * 1deg))",
          transition: "transform 220ms var(--ease-out-soft)",
        }}
      >
        {/* Halo dorado detrás del cluster — la capa más "lejana": es la que más
            se desplaza con el scroll. */}
        <div
          aria-hidden="true"
          className="parallax-layer pointer-events-none absolute -inset-8 -z-10"
          style={
            {
              "--parallax-depth": "42px",
              background:
                "radial-gradient(60% 55% at 60% 40%, rgba(201,162,62,0.18), transparent 70%)",
            } as React.CSSProperties
          }
        />

        {/* Panel principal: turnero de hoy */}
        <div
          className="parallax-layer card-premium p-4 sm:p-5"
          style={{ "--parallax-depth": "12px" } as React.CSSProperties}
        >
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
              <p
                ref={appointmentsRef}
                className="mt-0.5 text-xl font-black leading-none tabular-nums text-white"
              >
                24
              </p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-2)]/50 p-2.5">
              <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Ocupación
              </p>
              <p
                ref={occupancyRef}
                className="mt-0.5 text-xl font-black leading-none tabular-nums text-gold-gradient"
              >
                82%
              </p>
            </div>
          </div>
        </div>

        {/* Panel flotante: ingresos (superpuesto, solo sm+). La capa más
            "cercana": se mueve al revés que el halo. */}
        <div
          className="parallax-layer card-premium card-premium-glow absolute -bottom-8 -left-4 hidden w-52 p-3 sm:block"
          style={{ "--parallax-depth": "-22px" } as React.CSSProperties}
        >
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
            {BARS.map((v, i) => (
              <div
                key={i}
                className="animate-bar-grow bar-cascade flex-1 rounded-t-[2px]"
                style={
                  {
                    "--bar-index": i,
                    height: `${v}%`,
                    backgroundImage:
                      i === 6
                        ? "linear-gradient(180deg, var(--brand-gold-hi), var(--brand-gold-lo))"
                        : "linear-gradient(180deg, rgba(201,162,62,0.5), rgba(138,110,37,0.2))",
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>

        {/* Notificación cíclica: absoluta, en la esquina libre del cluster. */}
        <HeroNotification className="-bottom-6 right-0 sm:-bottom-7 sm:-right-3" />
      </div>
    </div>
  );
}
