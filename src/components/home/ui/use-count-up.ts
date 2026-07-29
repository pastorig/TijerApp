"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

type Options = {
  duration?: number;
  /** Cómo se escribe cada valor intermedio. Default: el número pelado. */
  format?: (value: number) => string;
};

/**
 * useCountUp — anima el `textContent` de un elemento desde 0 hasta su valor
 * final, una sola vez, cuando entra en pantalla.
 *
 * El valor final **ya está en el marcado** (SSR): el hook lo sobrescribe recién
 * después de montar. Sin JS, con movimiento reducido o si algo falla, el
 * visitante ve el número correcto — nunca un "0" (progressive enhancement).
 */
export function useCountUp<T extends HTMLElement>(
  target: number,
  { duration = 1100, format = (value) => String(value) }: Options = {},
) {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion) return;
    if (typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    let started = false;

    const run = () => {
      started = true;
      const startedAt = performance.now();
      const step = (now: number) => {
        const elapsed = now - startedAt;
        const t = Math.min(1, elapsed / duration);
        // easeOutCubic: arranca rápido y frena — se lee como un contador real.
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = format(Math.round(target * eased));
        if (t < 1) frame = requestAnimationFrame(step);
        else el.textContent = format(target);
      };
      frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            run();
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      // Si se desmonta a mitad de la animación, dejar el valor final.
      if (started) el.textContent = format(target);
    };
  }, [target, duration, format, prefersReducedMotion]);

  return ref;
}
