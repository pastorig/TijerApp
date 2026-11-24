"use client";

/**
 * Interruptor — selector de 2 a 4 opciones (feature 041, tanda 2). Portado de
 * Dentidad (`interruptor.tsx`).
 *
 * La opción elegida es UNA sola pastilla dorada que se desliza de una a otra
 * como un on/off de iOS: llega con un rebote chico y se estira al salir. Eso
 * pasa en el celular; en la compu se ve como el selector de siempre. Con
 * movimiento reducido cambia sin animación. Estilos en vidrio.css.
 */

import { useState, type ReactNode } from "react";

export type InterruptorOpcion<T extends string> = { valor: T; label: ReactNode };

export function Interruptor<T extends string>({
  opciones,
  valor,
  onChange,
  ariaLabel,
  className = "",
  rol = "radio",
}: {
  opciones: readonly InterruptorOpcion<T>[];
  valor: T;
  onChange: (valor: T) => void;
  ariaLabel: string;
  className?: string;
  /** "tab" cuando cambia lo que se ve debajo (Lista / Calendario). */
  rol?: "radio" | "tab";
}) {
  const n = opciones.length;
  const indice = opciones.findIndex((o) => o.valor === valor);
  // Alterna entre dos animaciones iguales para que el estirón arranque de
  // nuevo en cada cambio.
  const [vuelta, setVuelta] = useState(false);

  return (
    <div
      role={rol === "tab" ? "tablist" : "radiogroup"}
      aria-label={ariaLabel}
      className={`tj-interruptor relative grid rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-0.5 ${className}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {indice >= 0 ? (
        <span
          aria-hidden="true"
          className={`tj-interruptor-pastilla bg-gold-grad rounded-[var(--radius-xs)] ${
            vuelta ? "tj-interruptor-pastilla--b" : "tj-interruptor-pastilla--a"
          }`}
          // El ancho sale de vidrio.css con --n (el relleno cambia en el celular).
          style={{ "--n": n, transform: `translateX(calc(${indice} * 100%))` } as React.CSSProperties}
        />
      ) : null}
      {opciones.map((opcion) => {
        const elegido = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            role={rol}
            aria-checked={rol === "radio" ? elegido : undefined}
            aria-selected={rol === "tab" ? elegido : undefined}
            onClick={() => {
              if (elegido) return;
              setVuelta((v) => !v);
              onChange(opcion.valor);
            }}
            className={`relative z-10 inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 px-3 text-xs font-bold normal-case tracking-normal transition-colors duration-[var(--duration-fast)] ${
              elegido ? "text-black" : "text-[color:var(--text-secondary)] hover:text-white"
            }`}
          >
            {opcion.label}
          </button>
        );
      })}
    </div>
  );
}
