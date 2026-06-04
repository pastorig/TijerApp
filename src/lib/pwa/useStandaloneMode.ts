"use client";

import { useSyncExternalStore } from "react";

/**
 * Hook que detecta si la app está corriendo en modo standalone (instalada
 * como PWA).
 *
 * Returns true si:
 * - `display-mode: standalone` matches (Android Chrome, desktop)
 * - `navigator.standalone === true` (iOS Safari legacy)
 *
 * Returns false en server render y en browser tab normal.
 *
 * Implementado con useSyncExternalStore — el patrón correcto de React 19
 * para suscribirse a APIs externas (como media queries) sin caer en el
 * antipattern de setState-in-effect.
 *
 * Se usa para:
 * - Ocultar custom install button si ya está instalada
 * - Decidir si la home `/` debe redirigir al último contexto
 * - Distinguir UX de PWA vs web browser
 */

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const navWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navWithStandalone.standalone === true
  );
}

function getServerSnapshot(): boolean {
  return false;
}

export function useStandaloneMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
