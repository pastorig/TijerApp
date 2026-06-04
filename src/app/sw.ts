/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

/**
 * Service Worker entry point para TijerApp PWA.
 *
 * - precacheEntries: assets generados por Next.js (HTML, CSS, JS, fonts)
 *   que serwist incluye automáticamente del manifest.
 * - runtimeCaching: defaultCache aplica strategies sensatas:
 *   - StaleWhileRevalidate para HTML pages
 *   - CacheFirst para Next static assets versionados (/_next/static/*)
 *   - CacheFirst para imágenes con size limit
 *   - NetworkOnly para /api/* (no cachear endpoints dinámicos)
 * - skipWaiting + clientsClaim: el SW nuevo toma control inmediato sin
 *   esperar que se cierren todas las tabs.
 * - navigationPreload: acelera la primera request HTML.
 *
 * Offline fallback (T015): cuando una navigation request falla, serve
 * el documento /offline desde precache.
 */

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
} & SerwistGlobalConfig;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
