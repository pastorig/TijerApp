"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type BarberChip = {
  id: string;
  name: string;
  count: number;
  offDay: boolean;
};

/**
 * Barra de barberos del calendario en el celular: un chip por barbero con la
 * cantidad de turnos del día. El elegido se ve a pantalla completa abajo.
 * Se navega con toque, con las flechas del teclado o deslizando el calendario.
 */
export function AgendaBarberSwitcher({
  barbers,
  selectedId,
  onSelect,
}: {
  barbers: BarberChip[];
  selectedId: string;
  onSelect: (barberId: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // El chip elegido siempre queda a la vista (al deslizar el calendario se
  // puede elegir uno que estaba fuera de la barra).
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-barber-id="${selectedId}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selectedId]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = barbers.findIndex((b) => b.id === selectedId);
    const next = barbers[(index + (event.key === "ArrowRight" ? 1 : -1) + barbers.length) % barbers.length];
    if (next) {
      onSelect(next.id);
      listRef.current?.querySelector<HTMLElement>(`[data-barber-id="${next.id}"]`)?.focus();
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Barbero"
      onKeyDown={handleKeyDown}
      className="flex gap-2 overflow-x-auto overscroll-x-contain px-3 py-2 [scrollbar-width:none]"
    >
      {barbers.map((barber) => {
        const active = barber.id === selectedId;
        return (
          <button
            key={barber.id}
            type="button"
            role="tab"
            data-barber-id={barber.id}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(barber.id)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
              active
                ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] text-white"
                : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:text-white",
            )}
          >
            <span className="max-w-[9rem] truncate">{barber.name}</span>
            <span
              className={cn(
                "rounded-[var(--radius-xs)] px-1.5 font-mono text-xs tabular-nums",
                active
                  ? "bg-[color:var(--brand-gold)] text-black"
                  : "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]",
              )}
            >
              {barber.count}
            </span>
            {barber.offDay ? (
              <span className="text-xs font-normal text-[color:var(--text-muted)]">franco</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
