"use client";

import { useSyncExternalStore } from "react";
import { usePWAInstall } from "@/components/pwa/PWAInstallProvider";

/**
 * Hook que combina el state del PWAInstallProvider con la detección de iOS,
 * y devuelve un objeto cómodo de consumir desde botones/banners de install.
 *
 * - `canInstall`: true si el browser ofrece prompt nativo (Chromium) O si
 *   estamos en iOS (donde no hay prompt nativo pero queremos mostrar el
 *   tooltip de instrucciones manuales).
 * - `isiOS`: detecta iPad/iPhone/iPod sin MSStream (= no Edge Mobile, que
 *   también puede aparecer en el UA pero con MSStream definido).
 * - `isInstalled`: pasa del Provider — útil para esconder UI si ya está.
 * - `promptInstall()`: dispara el dialog nativo del browser.
 */

// La detección de iOS es estable durante la sesión (no cambia el UA), pero
// igual usamos useSyncExternalStore para que SSR devuelva false y client
// post-mount lea el navegador real, sin caer en el antipattern
// setState-in-effect.
function subscribeNoop(): () => void {
  return () => undefined;
}

function getIsiOSSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { MSStream?: unknown };
  const ua = nav.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !nav.MSStream;
}

function getIsiOSServerSnapshot(): boolean {
  return false;
}

export function useInstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const isiOS = useSyncExternalStore(
    subscribeNoop,
    getIsiOSSnapshot,
    getIsiOSServerSnapshot,
  );

  return {
    canInstall: (isInstallable || isiOS) && !isInstalled,
    isiOS,
    isInstalled,
    promptInstall,
  };
}
