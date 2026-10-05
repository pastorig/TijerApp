"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Reveal — hace entrar su contenido (fundido + subida corta) cuando está por
 * aparecer en pantalla. Una sola vez.
 *
 * Nada sale escondido del servidor: el elemento se oculta recién cuando el
 * navegador confirma que está por debajo de la pantalla, y lo que ya se ve al
 * cargar se deja quieto. Sin JavaScript (o mientras todavía no cargó) la
 * página se lee entera.
 *
 * ── Por qué está hecho así (medido, no supuesto) ────────────────────────────
 * La primera versión arrancaba cuando la pieza ya había entrado un 8% en la
 * pantalla y escalonaba las tarjetas con demora. Bajando con el dedo a
 * velocidad normal, en 4 de cada 10 cuadros había una pieza bien adentro de la
 * pantalla y todavía invisible: se veían huecos y después las cosas "saltaban".
 * Por eso ahora:
 * - arranca ANTES de entrar (margen de abajo positivo), así cuando la pieza se
 *   ve ya está casi en su lugar;
 * - la demora escalonada solo corre donde hay columnas (ver `.reveal` en
 *   globals.css): en una sola columna las tarjetas ya entran de a una;
 * - las clases se cambian directo en el elemento, sin estado de React: una
 *   pantalla con muchas piezas no vuelve a renderizar nada mientras se baja.
 *
 * `delay` (ms) escalona entradas dentro de una misma grilla.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "header" | "figure";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let primera = true;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.remove("is-waiting");
            // `is-visible` también para lo que ya estaba a la vista al cargar:
            // hay estilos que cuelgan de esa clase (el ícono que salta). Lo
            // que ya se veía no se anima (`is-still`).
            el.classList.add("is-visible");
            if (primera) el.classList.add("is-still");
            observer.disconnect();
          } else if (primera) {
            el.classList.add("is-waiting");
          }
          primera = false;
        }
      },
      { threshold: 0, rootMargin: "0px 0px 14% 0px" },
    );
    // En un carrusel horizontal (las tarjetas del celular) se mira el
    // carrusel entero: si no, la tarjeta que queda fuera por el costado nunca
    // "entra" al bajar y aparecería en blanco recién al deslizar.
    const padre = el.parentElement;
    const enCarrusel =
      padre !== null &&
      padre.scrollWidth > padre.clientWidth + 1 &&
      ["auto", "scroll"].includes(getComputedStyle(padre).overflowX);
    observer.observe(enCarrusel ? padre : el);
    return () => {
      observer.disconnect();
      el.classList.remove("is-waiting", "is-visible", "is-still");
    };
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>}
      className={cn("reveal", className)}
      style={
        delay
          ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </Tag>
  );
}
