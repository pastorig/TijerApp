"use client";

import { useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { useToast } from "@/components/ui";

type Props = { token: string };

const STORAGE_KEY_PREFIX = "tijerapp:client-push-opted-in:";

/**
 * Botón opt-in de push notifications para el CLIENTE en /r/[token].
 *
 * Flow:
 *  1. Verifica que el browser soporte push (SW + Notification API)
 *  2. Verifica si ya está suscrito (localStorage flag por token)
 *  3. Pide permission → activa serviceWorker → suscribe con VAPID
 *  4. POST /api/push/client-subscribe { token, subscription, userAgent }
 *  5. Marca el flag local para no volver a mostrar el opt-in
 *
 * No usa el endpoint admin /api/push/subscribe porque ése requiere auth.
 * Reusa el mismo service worker registrado por el shell.
 */
export function ClientPushOptIn({ token }: Props) {
  const toast = useToast();
  // Lazy init: detectamos capabilities y opt-in flag al primer render para
  // evitar setState dentro de useEffect (regla react-hooks/set-state-in-effect).
  // Si estamos SSR (typeof window === undefined), arranca null y se settea
  // al re-render del cliente. En la práctica del componente client-only,
  // window siempre existe en el primer render del browser.
  const [supported] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  });
  const [optedIn, setOptedIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY_PREFIX + token) === "1";
    } catch {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  async function handleOptIn() {
    setIsLoading(true);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        toast.error("Notificaciones no configuradas", {
          description: "Contactá a soporte.",
        });
        return;
      }

      // Pedir permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permiso denegado", {
          description: "Activá notificaciones en la configuración del navegador.",
        });
        return;
      }

      // Registrar / obtener SW
      const registration = await navigator.serviceWorker.ready;
      if (!registration) {
        toast.error("Service worker no listo");
        return;
      }

      // Convertir VAPID base64URL a Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // Suscribir
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast a BufferSource: TS estricto rechaza Uint8Array directo en
        // algunas versiones porque distingue SharedArrayBuffer.
        applicationServerKey: applicationServerKey as BufferSource,
      });

      const res = await fetch("/api/push/client-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("No se pudo activar", {
          description: err.error ?? `HTTP ${res.status}`,
        });
        // Logueo para inspeccionar en DevTools si el toast no es claro
        console.error("[ClientPushOptIn] subscribe failed:", {
          status: res.status,
          error: err.error,
        });
        return;
      }

      try {
        window.localStorage.setItem(STORAGE_KEY_PREFIX + token, "1");
      } catch {
        /* noop */
      }
      setOptedIn(true);
      toast.success("Notificaciones activadas", {
        description: "Te avisamos por acá cuando se acerque tu turno.",
      });
    } catch (err) {
      toast.error("Error activando", {
        description: err instanceof Error ? err.message : "Error desconocido.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (supported === null) return null;
  if (!supported) return null;

  return (
    <section className="mt-6 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {optedIn ? (
              <Check
                aria-hidden="true"
                className="size-4 shrink-0 text-[color:var(--success)]"
              />
            ) : (
              <Bell
                aria-hidden="true"
                className="size-4 shrink-0 text-[color:var(--brand-gold)]"
              />
            )}
            <p className="text-sm font-bold text-white">
              {optedIn
                ? "Recordatorio por push activo"
                : "Recordatorio sin abrir el mail"}
            </p>
          </div>
          <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
            {optedIn
              ? "Vas a recibir un aviso 24h antes en este navegador."
              : "Activá las notificaciones de este navegador y te avisamos cuando se acerque tu turno."}
          </p>
        </div>
        {!optedIn ? (
          <button
            type="button"
            onClick={() => void handleOptIn()}
            disabled={isLoading}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-xs font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Bell className="size-3.5" />
            {isLoading ? "Activando…" : "Activar"}
          </button>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)]">
            <BellOff className="size-3" />
            Listo
          </span>
        )}
      </div>
    </section>
  );
}

/**
 * Convierte la VAPID public key (base64URL) al Uint8Array que necesita
 * pushManager.subscribe(). Mismo helper que /admin usa, copiado para no
 * importar de un módulo admin.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData =
    typeof window !== "undefined" ? window.atob(base64) : "";
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    out[i] = rawData.charCodeAt(i);
  }
  return out;
}
