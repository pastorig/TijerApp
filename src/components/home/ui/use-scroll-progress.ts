"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/**
 * Cómo se mide el avance:
 * - `"through"`: 0 cuando el borde superior del elemento entra por abajo de la
 *   pantalla, 1 cuando su borde inferior llega a la zona alta. Es el modo para
 *   trazados que tienen que completarse *mientras* se lee la sección.
 * - `"away"`: 0 cuando el elemento está pegado al tope de la pantalla y crece a
 *   medida que se va hacia arriba. Es el modo para el parallax del hero, que
 *   tiene que arrancar quieto al cargar la página.
 */
export type ScrollProgressMode = "through" | "away";

type Options = {
  mode?: ScrollProgressMode;
  /** Fracción del alto de pantalla donde arranca el avance (modo "through"). */
  startOffset?: number;
  /** Fracción del alto de pantalla donde termina el avance (modo "through"). */
  endOffset?: number;
  /** Valor fijo de `--progress` con movimiento reducido. */
  reducedValue?: number;
};

/**
 * useScrollProgress — traduce el scroll de un elemento a un número 0→1 y lo
 * escribe como la custom property `--progress` sobre ese mismo elemento.
 *
 * Clave: **no pasa por el estado de React**. El scroll no dispara ni un
 * re-render; el CSS consume `--progress` con `transform` (compositor puro, cero
 * layout). El listener es pasivo, está throttleado por `requestAnimationFrame` y
 * un `IntersectionObserver` lo desconecta cuando la sección no está en pantalla,
 * así el resto de la home no paga nada.
 *
 * Con movimiento reducido no se registra ningún listener y `--progress` queda
 * fijo en `reducedValue` (estado final).
 */
export function useScrollProgress<T extends HTMLElement>({
  mode = "through",
  startOffset = 0.9,
  endOffset = 0.35,
  reducedValue = mode === "away" ? 0 : 1,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion) {
      el.style.setProperty("--progress", String(reducedValue));
      return;
    }

    let frame = 0;
    let listening = false;

    const compute = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      let progress: number;
      if (mode === "away") {
        progress = rect.height > 0 ? -rect.top / rect.height : 0;
      } else {
        const distance = rect.height + viewport * (startOffset - endOffset);
        progress =
          distance > 0 ? (viewport * startOffset - rect.top) / distance : 0;
      }
      const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
      el.style.setProperty("--progress", clamped.toFixed(4));
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(compute);
    };

    const startListening = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      schedule();
    };

    const stopListening = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };

    compute();

    if (typeof IntersectionObserver === "undefined") {
      startListening();
      return () => {
        stopListening();
        if (frame) cancelAnimationFrame(frame);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) startListening();
          else stopListening();
        }
      },
      { rootMargin: "15% 0px" },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      stopListening();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mode, startOffset, endOffset, reducedValue, prefersReducedMotion]);

  return ref;
}
