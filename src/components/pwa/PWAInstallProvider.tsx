"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStandaloneMode } from "@/lib/pwa/useStandaloneMode";

/**
 * PWAInstallProvider — captura el `beforeinstallprompt` event globalmente
 * y expone el estado de instalación a toda la app via context.
 *
 * Por qué un Context: el `beforeinstallprompt` event SOLO se dispara una
 * vez por sesión. Si lo capturamos en un solo lugar (este Provider en el
 * layout), cualquier componente puede leer el state via `usePWAInstall`.
 *
 * `isInstalled` se deriva de 2 sources:
 * - `useStandaloneMode()` — refleja display-mode: standalone en tiempo real
 * - state interno `appInstalledFired` — flag de evento appinstalled
 *
 * Compat: Chromium-based browsers (Chrome, Edge, Brave, Opera) y Firefox
 * recientes. Safari/iOS no implementa `beforeinstallprompt` — el flag
 * `isInstallable` queda false, los components clients usan `isiOS`
 * detectado aparte.
 */

// Tipo del event no incluido en lib.dom estándar — declaración manual
type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PWAInstallContextValue = {
  /** Browser disparó beforeinstallprompt y todavía no se aceptó/rechazó. */
  isInstallable: boolean;
  /** App ya está instalada (detectado via appinstalled o display-mode). */
  isInstalled: boolean;
  /**
   * Dispara el prompt nativo del browser. Solo funciona si isInstallable=true.
   * Devuelve "accepted" si el user instaló, "dismissed" si canceló o si
   * el prompt no estaba disponible.
   */
  promptInstall: () => Promise<"accepted" | "dismissed">;
};

const PWAInstallContext = createContext<PWAInstallContextValue | null>(null);

export function usePWAInstall(): PWAInstallContextValue {
  const ctx = useContext(PWAInstallContext);
  if (!ctx) {
    throw new Error(
      "usePWAInstall must be used within <PWAInstallProvider>",
    );
  }
  return ctx;
}

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [appInstalledFired, setAppInstalledFired] = useState(false);
  const isStandalone = useStandaloneMode();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Capturar el prompt cuando el browser lo dispare. Prevent default
    // para mostrar nuestro UI custom y disparar el prompt cuando el user
    // clickea, en lugar del banner default del browser.
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    // Detectar instalación exitosa (Chromium dispara este event después
    // de que el user acepta el prompt e instala efectivamente)
    const handleAppInstalled = () => {
      setAppInstalledFired(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed"
  > => {
    if (!deferredPrompt) return "dismissed";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null); // Solo se puede usar una vez
    return choice.outcome;
  }, [deferredPrompt]);

  return (
    <PWAInstallContext.Provider
      value={{
        isInstallable: deferredPrompt !== null,
        isInstalled: isStandalone || appInstalledFired,
        promptInstall,
      }}
    >
      {children}
    </PWAInstallContext.Provider>
  );
}
