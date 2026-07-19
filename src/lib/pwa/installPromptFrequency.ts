"use client";

import { useEffect } from "react";
import { useSyncExternalStore } from "react";

/**
 * Frecuencia con la que ofrecemos instalar la PWA (banner de install).
 *
 * Regla:
 *  - Durante las PRIMERAS `FIRST_VISITS` visitas se muestra en cada visita
 *    (el usuario todavía está conociendo la app; si la cierra, vuelve a
 *    aparecer la próxima vez que entra).
 *  - Después de esas visitas pasa a modo recordatorio: solo reaparece si
 *    pasaron `REPEAT_DAYS` días desde la última vez que la cerró.
 *  - Si la cierra, no vuelve a molestar en esa misma sesión.
 *  - Nunca se muestra si la app ya está instalada (eso lo chequea el banner
 *    con `useInstallPrompt`).
 *
 * Una "visita" = una sesión del navegador (sessionStorage), no cada navegación
 * entre páginas: si no, navegar por el sitio inflaría el contador enseguida.
 *
 * Todo vive en localStorage/sessionStorage (no hace falta backend) y se lee
 * con useSyncExternalStore para no caer en setState-dentro-de-effect.
 */

/** Visitas iniciales en las que el banner aparece siempre. */
export const FIRST_VISITS = 4;
/** Días de espera entre recordatorios, pasadas las visitas iniciales. */
export const REPEAT_DAYS = 4;

const REPEAT_MS = REPEAT_DAYS * 24 * 60 * 60 * 1000;

const VISITS_KEY = "tijerapp:pwa_visits";
/** Timestamp de la última vez que lo cerró (clave histórica, se reusa). */
const LAST_DISMISS_KEY = "tijerapp:install_banner_dismissed";
const SESSION_COUNTED_KEY = "tijerapp:pwa_visit_counted";
const SESSION_DISMISSED_KEY = "tijerapp:pwa_dismissed_session";

/**
 * El evento `storage` nativo solo se dispara en OTRAS pestañas. Este evento
 * custom hace que la pestaña actual re-evalúe al cerrar el banner o al
 * contar la visita.
 */
const CHANGE_EVENT = "tijerapp-install-prompt-changed";

function notifyChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readNumber(storage: Storage, key: string): number {
  const raw = storage.getItem(key);
  if (!raw) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

/** Suma 1 al contador de visitas, una sola vez por sesión del navegador. */
export function registerVisit(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(SESSION_COUNTED_KEY)) return;
    window.sessionStorage.setItem(SESSION_COUNTED_KEY, "1");
    const visits = readNumber(window.localStorage, VISITS_KEY) + 1;
    window.localStorage.setItem(VISITS_KEY, String(visits));
    notifyChange();
  } catch {
    // incognito / storage bloqueado: no pasa nada, simplemente no persiste.
  }
}

/** Registra que el usuario cerró el banner (o rechazó el prompt nativo). */
export function dismissInstallPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_DISMISS_KEY, String(Date.now()));
    window.sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
    notifyChange();
  } catch {
    // ignore
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * La regla, aislada y pura para poder testearla sin DOM ni storage.
 *
 * @param visits              visitas acumuladas (sesiones distintas)
 * @param lastDismissedAt     timestamp del último cierre (0 = nunca lo cerró)
 * @param dismissedThisSession si ya lo cerró en esta sesión
 * @param now                 timestamp actual
 */
export function shouldOfferInstall({
  visits,
  lastDismissedAt,
  dismissedThisSession,
  now,
}: {
  visits: number;
  lastDismissedAt: number;
  dismissedThisSession: boolean;
  now: number;
}): boolean {
  // Lo cerró en esta sesión: no insistir hasta la próxima visita.
  if (dismissedThisSession) return false;
  // Primeras visitas: mostrar siempre.
  if (visits <= FIRST_VISITS) return true;
  // Después: solo si pasaron REPEAT_DAYS desde el último cierre.
  if (!lastDismissedAt) return true;
  return now - lastDismissedAt >= REPEAT_MS;
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return shouldOfferInstall({
      visits: readNumber(window.localStorage, VISITS_KEY),
      lastDismissedAt: readNumber(window.localStorage, LAST_DISMISS_KEY),
      dismissedThisSession: Boolean(
        window.sessionStorage.getItem(SESSION_DISMISSED_KEY),
      ),
      now: Date.now(),
    });
  } catch {
    return false;
  }
}

/** En SSR nunca mostramos (evita mismatch de hidratación). */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Cuenta la visita al montar y devuelve si toca ofrecer la instalación
 * según la regla de frecuencia.
 */
export function useShouldOfferInstall(): boolean {
  useEffect(() => {
    registerVisit();
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
