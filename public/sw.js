/**
 * Service Worker manual para TijerApp PWA.
 *
 * Escrito a mano (sin serwist/next-pwa) para compatibility con Turbopack.
 * Estrategia minimal pero suficiente para:
 *  - Hacer la app "installable" (Chrome requiere un SW activo)
 *  - Servir /offline cuando una navigation request falla por red
 *  - Cache básico stale-while-revalidate para assets estáticos versionados
 *
 * Versionado: bump CACHE_VERSION cuando cambien assets críticos del SW.
 * En cada deploy nuevo de la app, los hashes de Next.js cambian — el cache
 * de assets se invalida automáticamente porque los URLs son distintos.
 */

const CACHE_VERSION = "v2-push";
const RUNTIME_CACHE = `tijerapp-runtime-${CACHE_VERSION}`;
const OFFLINE_CACHE = `tijerapp-offline-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// ─── Install ──────────────────────────────────────────────────────────────
// Pre-cachear la página offline para que esté disponible sin red.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      try {
        await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      } catch (err) {
        console.warn("[sw] no pude precachear /offline:", err);
      }
      // skipWaiting → el SW nuevo toma control inmediatamente sin esperar
      // que se cierren todas las tabs viejas
      await self.skipWaiting();
    })(),
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────
// Borrar caches viejos de versiones anteriores. clientsClaim para que el
// SW nuevo controle las tabs ya abiertas.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              !key.endsWith(CACHE_VERSION) &&
              (key.startsWith("tijerapp-runtime-") ||
                key.startsWith("tijerapp-offline-")),
          )
          .map((key) => caches.delete(key)),
      );
      // Habilitar navigationPreload para que el browser empiece la network
      // request de navegación en paralelo con la activación del SW
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────
// 3 estrategias según el tipo de request:
//   1. Navigation (HTML pages) → network-first con fallback a /offline
//   2. Static assets (Next.js hashed _next/static) → cache-first
//   3. Todo lo demás → network (sin cache)
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo manejamos GET. Mutaciones (POST, PATCH, DELETE) siempre van a red.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // No tocar requests a otros origins (Supabase, Sentry, fonts.googleapis, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip rutas API (NetworkOnly)
  if (url.pathname.startsWith("/api/")) return;

  // Skip rutas de monitoreo de Sentry
  if (url.pathname.startsWith("/monitoring")) return;

  // ─── Navigation: network-first → fallback /offline ─────────────────────
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Intentar navigation preload primero (más rápido)
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) return preloadResponse;

          const networkResponse = await fetch(request);
          return networkResponse;
        } catch {
          // Sin red — devolver la página offline desde cache
          const cache = await caches.open(OFFLINE_CACHE);
          const offlineResponse = await cache.match(OFFLINE_URL);
          return (
            offlineResponse ||
            new Response("Sin conexión", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // ─── Static assets versionados: cache-first ────────────────────────────
  // Next.js emite assets con hash en el filename → cache infinito es safe
  const isHashedAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff");

  if (isHashedAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            cache.put(request, fresh.clone()).catch(() => undefined);
          }
          return fresh;
        } catch {
          return new Response("", { status: 504 });
        }
      })(),
    );
  }

  // Todo lo demás (HTML pages no-navigate, etc.) → default browser network
});

// ─── Push Notifications ───────────────────────────────────────────────────
// Handlers para recibir push notifications del backend y manejar el tap.
//
// Flujo:
//   1. Backend (Vercel) envía push via web-push API → push service
//      (FCM/Mozilla/Apple) → SW recibe el evento `push`
//   2. SW decodifica el payload JSON con { title, body, url, tag }
//   3. SW llama showNotification → el OS muestra la notif
//   4. Al tap, SW abre/foquea la ventana en el URL del payload

/**
 * Push event — viene un mensaje del push service.
 *
 * Payload shape esperado (de src/lib/push/sender.ts):
 *   { title, body, url, tag }
 *
 * Si el payload está corrupto, mostramos un fallback genérico para que
 * el barbero al menos sepa que algo entró.
 */
self.addEventListener("push", (event) => {
  let payload = {
    title: "TijerApp",
    body: "Nueva actividad en tu barbería",
    url: "/",
    tag: "tijerapp-fallback",
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: typeof parsed.title === "string" ? parsed.title : payload.title,
        body: typeof parsed.body === "string" ? parsed.body : payload.body,
        url: typeof parsed.url === "string" ? parsed.url : payload.url,
        tag: typeof parsed.tag === "string" ? parsed.tag : payload.tag,
      };
    }
  } catch (err) {
    console.warn("[sw] push payload parse failed:", err);
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/brand/icons/manifest-icon-192.png",
      badge: "/brand/icons/manifest-icon-192.png",
      tag: payload.tag,
      // renotify: true hace que el OS vibre/suene incluso si hay otra
      // notif con el mismo tag (replazado)
      renotify: true,
      // data se preserva para el notificationclick handler
      data: { url: payload.url },
      // requireInteraction: el barbero ve la notif hasta que la cierre/tape
      requireInteraction: false,
    }),
  );
});

/**
 * Notification click — el user tocó la notif.
 *
 * Estrategia:
 *   - Si ya hay una tab del mismo origen abierta, la foqueamos +
 *     navegamos a `payload.url`
 *   - Si no hay ninguna, abrimos una ventana nueva en `payload.url`
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";
  const targetAbsoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Buscar una tab existente del mismo origen
      for (const client of clientsList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && "focus" in client) {
          // Navegar a la URL target si no está ahí, después focus
          try {
            await client.navigate(targetAbsoluteUrl);
          } catch {
            // Algunos browsers no permiten navigate cross-page; ignoramos
          }
          return client.focus();
        }
      }

      // No hay tabs abiertas → abrir ventana nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetAbsoluteUrl);
      }
      return null;
    })(),
  );
});
