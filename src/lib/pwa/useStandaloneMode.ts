"use client";

import { useEffect, useState } from "react";

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
 * Se usa para:
 * - Ocultar custom install button si ya está instalada
 * - Decidir si la home `/` debe redirigir al último contexto
 * - Distinguir UX de PWA vs web browser
 */
export function useStandaloneMode(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqlStandalone = window.matchMedia("(display-mode: standalone)");

    // iOS Safari (legacy): navigator.standalone es boolean
    // TypeScript no lo tipa por default, así que castamos
    const navWithStandalone = window.navigator as Navigator & {
      standalone?: boolean;
    };
    const iosStandalone = navWithStandalone.standalone === true;

    setIsStandalone(mqlStandalone.matches || iosStandalone);

    // Listener para cambios (raro pero posible si user instala mientras
    // está abierta la tab del browser)
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches || iosStandalone);
    };
    mqlStandalone.addEventListener("change", handleChange);

    return () => {
      mqlStandalone.removeEventListener("change", handleChange);
    };
  }, []);

  return isStandalone;
}
