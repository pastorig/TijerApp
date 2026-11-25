"use client";

/**
 * El final de una lista larga que se dibuja de a tandas (feature 045).
 *
 * Con 364 turnos el Turnero armaba ~28.000 elementos de una vez: en un celular
 * flojo eso traba el scroll varios segundos. Ahora se dibujan 40 y, cuando el
 * final de la lista entra en pantalla, se suman los siguientes solos. El botón
 * queda por si el navegador no avisa (o para quien prefiere tocar).
 */

import { useEffect, useRef } from "react";

export function MostrarMas({
  quedan,
  onMas,
  tanda,
}: {
  /** Cuántos faltan dibujar. */
  quedan: number;
  onMas: () => void;
  /** Cuántos suma cada vez (para el texto del botón). */
  tanda: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const alMas = useRef(onMas);
  useEffect(() => {
    alMas.current = onMas;
  }, [onMas]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // Se adelanta 600 px: cuando el dedo llega al final, ya están.
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) alMas.current();
      },
      { rootMargin: "600px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [quedan]);

  if (quedan <= 0) return null;
  return (
    <div ref={ref} className="mt-4 flex justify-center">
      <button
        type="button"
        onClick={onMas}
        className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-xs font-bold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
      >
        Mostrar {Math.min(tanda, quedan)} más · quedan {quedan}
      </button>
    </div>
  );
}
