"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Reveal — hace entrar su contenido (fundido + subida) cuando aparece en
 * pantalla. Una sola vez.
 *
 * Nada sale escondido del servidor: el elemento se oculta recién cuando el
 * navegador confirma que está por debajo de la pantalla, y lo que ya se ve al
 * cargar se deja quieto. Sin JavaScript (o mientras todavía no cargó) la
 * página se lee entera.
 *
 * Los estilos viven en `.reveal` (globals.css); `prefers-reduced-motion` ya
 * deja la entrada sin movimiento.
 *
 * `delay` (ms) escalona entradas dentro de una misma grilla.
 */
type Estado = "sin-medir" | "esperando" | "entrando" | "quieta";

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
  const [estado, setEstado] = useState<Estado>("sin-medir");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let primera = true;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Si ya estaba a la vista al cargar, no hay entrada que mostrar.
            setEstado(primera ? "quieta" : "entrando");
            observer.disconnect();
          } else if (primera) {
            setEstado("esperando");
          }
          primera = false;
        }
      },
      // Sin umbral: en los carruseles del celular la tarjeta que asoma por el
      // costado tiene que entrar con las demás, no quedar en blanco.
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
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
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLLIElement>}
      className={cn(
        "reveal",
        estado === "esperando" && "is-waiting",
        // `is-visible` también para lo que ya estaba a la vista: hay estilos
        // que cuelgan de esa clase (el ícono que salta, por ejemplo).
        (estado === "entrando" || estado === "quieta") && "is-visible",
        estado === "quieta" && "is-still",
        className,
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
