"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegister — registra /sw.js en el navegador cuando la app
 * carga. Sin UI.
 *
 * Solo registra en producción para no interferir con el HMR de dev.
 *
 * Listo para que el browser dispare `beforeinstallprompt` (uno de los
 * criterios PWA es tener un SW activo en el origin).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (err) {
        console.warn("[sw] registration failed:", err);
      }
    };

    // Esperar load para no competir con el critical path inicial
    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
