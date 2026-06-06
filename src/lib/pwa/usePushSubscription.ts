"use client";

import { useSyncExternalStore } from "react";
import { getCurrentSession } from "@/lib/auth";
import { getPublicVapidKey } from "@/lib/push/vapid";

/**
 * Push Subscription Hook — TijerApp
 *
 * Detecta el estado actual del device y expone acciones para subscribe,
 * unsubscribe y send test.
 *
 * Estados posibles:
 *   - "unsupported": el browser no tiene PushManager o Notification API
 *   - "ios-needs-install": iOS Safari pero la PWA no está instalada
 *   - "default": permission no fue pedido todavía
 *   - "denied": user denegó permission — debe habilitarlo manualmente
 *   - "granted-no-subscription": permission OK pero no hay sub en este device
 *   - "subscribed-this-device": hay subscription activa en este device
 *   - "checking": leyendo estado inicial (server render / pre-effect)
 *
 * Pattern: useSyncExternalStore para evitar set-state-in-effect lint warnings
 * y mantener consistencia con el ciclo de mount/unmount.
 */

export type PushSubscriptionState =
  | "checking"
  | "unsupported"
  | "ios-needs-install"
  | "default"
  | "denied"
  | "granted-no-subscription"
  | "subscribed-this-device";

type Snapshot = {
  state: PushSubscriptionState;
  endpoint: string | null;
};

const initialSnapshot: Snapshot = {
  state: "checking",
  endpoint: null,
};

// Convierte la public VAPID key (base64url) a ArrayBuffer para PushManager.
// Devolvemos un BufferSource (ArrayBuffer) en lugar de Uint8Array para que
// matchee con el tipo applicationServerKey: BufferSource del DOM lib.
function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(ua) &&
    !/(crios|fxios|edgios)/.test(ua)
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { navigator: { standalone?: boolean } };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    w.navigator.standalone === true
  );
}

async function detectState(): Promise<Snapshot> {
  if (typeof window === "undefined") {
    return { state: "checking", endpoint: null };
  }

  // 1. Feature detection
  if (!("PushManager" in window) || !("Notification" in window)) {
    return { state: "unsupported", endpoint: null };
  }

  // 2. iOS necesita PWA instalada
  if (isIos() && !isStandalone()) {
    return { state: "ios-needs-install", endpoint: null };
  }

  // 3. Permission state
  const permission = Notification.permission;
  if (permission === "denied") {
    return { state: "denied", endpoint: null };
  }
  if (permission === "default") {
    return { state: "default", endpoint: null };
  }

  // 4. permission === 'granted' → ver si hay subscription en este device
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      return {
        state: "subscribed-this-device",
        endpoint: existing.endpoint,
      };
    }
    return { state: "granted-no-subscription", endpoint: null };
  } catch (err) {
    console.warn("[push] Error leyendo subscription actual:", err);
    return { state: "granted-no-subscription", endpoint: null };
  }
}

// Singleton snapshot global con listeners — para useSyncExternalStore.
let currentSnapshot: Snapshot = initialSnapshot;
const listeners = new Set<() => void>();

function setSnapshot(next: Snapshot) {
  currentSnapshot = next;
  listeners.forEach((l) => l());
}

async function refresh() {
  const next = await detectState();
  setSnapshot(next);
}

function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  // Trigger inicial — solo si todavía no se detectó nada
  if (currentSnapshot.state === "checking") {
    refresh().catch((err) => console.warn("[push] detectState failed:", err));
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Snapshot {
  return currentSnapshot;
}

function getServerSnapshot(): Snapshot {
  return initialSnapshot;
}

export type UsePushSubscriptionReturn = {
  state: PushSubscriptionState;
  endpoint: string | null;
  /**
   * Pide permiso al browser, llama PushManager.subscribe, y guarda la sub
   * en el server vía POST /api/push/subscribe.
   */
  subscribe: (barbershopSlug: string) => Promise<void>;
  /**
   * Llama PushManager.unsubscribe en este device y DELETE /api/push/unsubscribe.
   */
  unsubscribe: () => Promise<void>;
  /**
   * Encola un push de prueba via POST /api/push/send-test.
   */
  sendTest: (barbershopSlug: string) => Promise<{ enqueued: number }>;
};

export function usePushSubscription(): UsePushSubscriptionReturn {
  const snapshot = useSyncExternalStore(
    subscribeStore,
    getSnapshot,
    getServerSnapshot,
  );

  async function subscribe(barbershopSlug: string): Promise<void> {
    // 1. Pedir permission si no fue pedido
    let permission = Notification.permission;
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      throw new Error(
        permission === "denied"
          ? "Bloqueaste las notificaciones. Habilitalas desde el navegador."
          : "Permiso de notificaciones no otorgado.",
      );
    }

    // 2. PushManager.subscribe
    const reg = await navigator.serviceWorker.ready;
    const pmSubscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(getPublicVapidKey()),
    });

    // 3. Get session access token
    const { data: sessionData } = await getCurrentSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error("Tu sesión expiró, volvé a iniciar sesión.");
    }

    // 4. Send to server
    const subscriptionJson = pmSubscription.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        barbershopSlug,
        subscription: subscriptionJson,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
      }),
    });

    if (!res.ok) {
      // Si el server rechaza, no dejes la sub local activa
      try {
        await pmSubscription.unsubscribe();
      } catch {
        /* noop */
      }
      const err = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(err.error ?? `Error al subscribir (${res.status}).`);
    }

    await refresh();
  }

  async function unsubscribe(): Promise<void> {
    const reg = await navigator.serviceWorker.ready;
    const pmSubscription = await reg.pushManager.getSubscription();
    if (!pmSubscription) {
      await refresh();
      return;
    }

    const { data: sessionData } = await getCurrentSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error("Tu sesión expiró, volvé a iniciar sesión.");
    }

    // 1. Borrar del server (idempotente)
    const res = await fetch("/api/push/unsubscribe", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ endpoint: pmSubscription.endpoint }),
    });
    if (!res.ok && res.status !== 204) {
      console.warn("[push] DELETE /unsubscribe falló:", res.status);
    }

    // 2. Borrar localmente
    await pmSubscription.unsubscribe();
    await refresh();
  }

  async function sendTest(
    barbershopSlug: string,
  ): Promise<{ enqueued: number }> {
    const { data: sessionData } = await getCurrentSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error("Tu sesión expiró, volvé a iniciar sesión.");
    }

    const res = await fetch("/api/push/send-test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ barbershopSlug }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(err.error ?? `Error enviando test (${res.status}).`);
    }

    const data = (await res.json()) as { enqueued: number };
    return data;
  }

  return {
    state: snapshot.state,
    endpoint: snapshot.endpoint,
    subscribe,
    unsubscribe,
    sendTest,
  };
}
