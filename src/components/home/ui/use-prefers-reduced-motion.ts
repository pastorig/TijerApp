"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(QUERY).matches;
}

// En el servidor no hay preferencia que leer: se asume "sin reducir" y el
// cliente corrige en el primer commit. Nada del contenido depende de esto
// (el marcado ya trae el estado final), así que no hay salto visible.
function getServerSnapshot() {
  return false;
}

/**
 * usePrefersReducedMotion — true si el visitante pidió reducir el movimiento.
 *
 * `globals.css` ya neutraliza `animation-duration` / `transition-duration` (y
 * sus delays) bajo esa preferencia, así que las animaciones puramente CSS están
 * cubiertas. Este hook es para lo que gobierna JS (parallax, contadores,
 * ciclos): ahí hace falta un chequeo explícito para no registrar listeners ni
 * arrancar timers.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
