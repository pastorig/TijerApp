"use client";

import type { ReactNode } from "react";
import { useScrollProgress } from "./use-scroll-progress";

/**
 * StepsProgressLine — la lista de pasos de "Cómo funciona", con la línea dorada
 * que se traza siguiendo el scroll.
 *
 * Es el `<ol>` mismo: así el avance (`--progress`) queda escrito en el elemento
 * que contiene tanto a la línea como a los pasos, y **todo lo demás es CSS**. La
 * línea lo consume con `scaleX`; cada ícono compara el avance contra su umbral
 * (`--step-threshold`) y se enciende cuando el trazado lo alcanza. Cero estado
 * de React y cero re-renders durante el scroll.
 *
 * Los pasos llegan como `children` ya renderizados en el servidor: este wrapper
 * no los toca.
 */
export function StepsProgressLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useScrollProgress<HTMLOListElement>({
    mode: "through",
    startOffset: 0.85,
    endOffset: 0.55,
  });

  return (
    <ol ref={ref} className={className}>
      {/* Línea de flujo que conecta los 3 pasos en desktop. Va detrás de
          las cards (fondo sólido), así que solo asoma en los gaps entre
          pasos, a la altura de los íconos → efecto de pasos encadenados. */}
      <div
        aria-hidden="true"
        className="scroll-line pointer-events-none absolute left-[16.66%] right-[16.66%] top-[3.5rem] hidden h-px sm:block"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--brand-gold-ring) 15%, var(--brand-gold-ring) 85%, transparent)",
        }}
      />
      {children}
    </ol>
  );
}
