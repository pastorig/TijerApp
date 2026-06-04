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

const CACHE_VERSION = "v1";
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
