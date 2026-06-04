# Research: PWA Instalable

**Feature**: [spec.md](spec.md)
**Phase**: 0 (Research)
**Date**: 2026-06-03

## Decision 1: Service Worker library

**Chosen**: `@serwist/next`

**Rationale**:
- Sucesor oficial de `next-pwa` (mismo autor). `next-pwa` está prácticamente abandonado desde Next 12; tiene issues abiertos con App Router.
- Diseñado App Router-first (Next 13+), funciona con Next 16 sin patches.
- API declarativa: defino el SW como un archivo TS y serwist lo bundlea con cache strategies opt-in.
- Mantiene compatibility con la documentación de PWA estándar (Workbox bajo el capó).
- Bundle size razonable (~6KB gzipped del runtime).
- MIT, sin lock-in.

**Alternatives considered**:
- `next-pwa`: rechazado por falta de mantenimiento y bugs con App Router.
- Custom service worker: ~100-150 LOC de boilerplate, manual cache invalidation, manual versioning. Costo de mantenimiento alto para MVP scope sin ganar nada vs serwist.
- `vite-plugin-pwa` adapter: no aplica (no usamos Vite).

## Decision 2: Icon generation desde SVG

**Chosen**: `npx pwa-asset-generator` como herramienta one-time (no como dependencia del proyecto)

**Rationale**:
- Genera TODOS los icons necesarios de una sola pasada: 192×192, 512×512, apple-touch-icon (180×180), favicon multi-size, maskable icons.
- Output va a `public/brand/icons/`, se commitea al repo. Cero costo en build.
- Se invoca solo cuando cambia el isotipo (rara vez). Hoy lo corremos una vez, después olvidamos.
- Source: el SVG actual de `public/brand/icon.svg` (T con alas gold).

**Alternatives considered**:
- `sharp` en un script build-time: agrega dep, complejidad, y los icons cambian rara vez (no justifica regenerar en cada deploy).
- Generators online (favicon.io, realfavicongenerator.net): UX manual, hay que subir/bajar archivos cada cambio, riesgo de privacy/trust con assets de marca.

**Command (a correr 1 vez)**:
```bash
npx pwa-asset-generator public/brand/icon.svg public/brand/icons \
  --background "#0a0a0a" \
  --padding "10%" \
  --maskable false \
  --manifest false \
  --type png
```

## Decision 3: Last-context routing multi-tenant

**Chosen**: `localStorage` + página redirector en `start_url`

**Rationale**:
- Cuando un barbero/cliente navega `/[slug]/admin` o `/[slug]`, guardamos en `localStorage`:
  - `tijerapp:last_slug` = `"sv-barber"`
  - `tijerapp:last_role` = `"admin"` | `"public"`
- El manifest tiene `start_url: "/"`.
- La home `/` detecta si vino desde el PWA standalone (via search param o display-mode) y, si hay `last_slug`, redirect a `/<slug>/admin` o `/<slug>`.
- Si NO hay `last_slug` (primera vez), queda en `/` (landing comercial de TijerApp).

**Alternatives considered**:
- Cookie HTTP-only: requiere endpoint para set/get, complejidad innecesaria para un valor pure-client.
- URL hash en el icon: no se preserva al instalar en home screen (Android usa `start_url` literal, ignora hash).
- Manifest dinámico per-slug (`/api/manifest?slug=sv-barber`): rompe el modelo "una sola PWA" y multiplica la complejidad de service worker registration por tenant.

**Trade-off aceptado**: Si el usuario limpia su `localStorage` o navega en incógnito y después instala desde otra ruta, "pierde" el contexto. Es aceptable; es un edge case de poco impacto.

## Decision 4: Cache strategy

**Chosen**: strategy-per-route pattern via serwist runtime caching

| Tipo de request | Strategy | Razón |
|---|---|---|
| HTML pages (`/`, `/[slug]`, `/[slug]/admin`, etc.) | `StaleWhileRevalidate` | Siempre fresh pero load instantáneo con fallback |
| Next static assets (`/_next/static/*`, hashed) | `CacheFirst` con max-age 1 año | Hashes garantizan immutabilidad |
| Imágenes (`/_next/image/*`, `/brand/*`) | `CacheFirst` con size limit 50 entries | Frecuente, pesa, cambia poco |
| API routes (`/api/*`) | `NetworkOnly` | DB-dependent, NO cachear nunca |
| Supabase requests (cross-origin) | `NetworkOnly` | Mismo razonamiento |
| Manifest, robots, sitemap | `StaleWhileRevalidate` | Pequeños y cambian rara vez |

**Offline fallback**: cuando una request HTML falla y no hay cache → redirect a `/offline`.

## Decision 5: Página de fallback offline

**Chosen**: ruta estática `/offline` renderizada server-side, sin dependencias dinámicas

**Rationale**:
- Estática y simple → cacheable indefinidamente por el SW.
- Sin fetch a DB ni assets externos → garantiza funcionar sin red.
- UI mínima: isotipo + heading "Sin conexión" + botón "Reintentar" (que hace `window.location.reload()`).
- Tema oscuro coherente con la app (negro + gold).

**Alternatives considered**:
- Modal/banner en cada página: complica el SW y la UX. Usuarios esperan "fallback page" en PWA.
- Página dinámica con info de network: añade complejidad sin valor.

## Decision 6: Install prompt UI

**Chosen**: hybrid (nativo + custom button) via Context Provider

**Implementation pattern**:
1. **PWAInstallProvider** wrapping en `app/layout.tsx`:
   - Captura `beforeinstallprompt` event globalmente, lo guarda en state.
   - Detecta `display-mode: standalone` para saber si ya está instalada.
   - Expone hook `usePWAInstall()` que devuelve `{ isInstallable, isInstalled, prompt }`.

2. **InstallButton component**:
   - Renderiza un botón "Instalar app" solo cuando `isInstallable && !isInstalled`.
   - Al click llama `prompt()` que dispara el dialog nativo del browser.
   - Se monta en 2 lugares:
     - Footer del admin (`/[slug]/admin/*`)
     - Landing pública (`/[slug]`) — banner pequeño y dismissable

3. **Re-engagement**:
   - Si user dismissea el banner de la landing, guardamos en localStorage para no mostrar de nuevo en 30 días.
   - Si user ya instaló (detectado por `appinstalled` event o standalone display), ocultamos para siempre.

## Decision 7: PWA scope y start_url

**Chosen**: `scope: "/"`, `start_url: "/?source=pwa"`

**Rationale**:
- `scope: "/"` → la PWA cubre toda la app, navegación interna queda dentro del standalone window.
- `start_url: "/?source=pwa"` → cuando se abre desde home screen, el query param permite:
  - Trackear instalaciones (analytics futuro)
  - El redirector page distingue "vino desde PWA install" vs "vino desde browser"

## Decision 8: Browser compatibility & graceful degradation

**Strategy**: feature detection per capability

- `'serviceWorker' in navigator` → registrar SW
- `'BeforeInstallPromptEvent' in window` → mostrar custom InstallButton
- `display-mode: standalone` media query → ocultar prompts cuando ya está instalado
- iOS Safari: usa `apple-touch-icon` + `apple-mobile-web-app-capable` + `apple-mobile-web-app-status-bar-style`. No tiene `beforeinstallprompt` — el custom button en iOS muestra un tooltip "Tocá Compartir → Agregar a inicio".

## Resolved unknowns

| Original ambiguity | Resolution |
|---|---|
| Cuál library de SW usar | `@serwist/next` |
| Cómo generar icons PNG | `npx pwa-asset-generator` one-time |
| Cómo preservar last-context multi-tenant | `localStorage` + redirector page |
| Estrategia de cache exacta | strategy-per-route table (ver Decision 4) |
| iOS Safari fallback para install prompt | Tooltip con instrucciones manuales |

Ningún `[NEEDS CLARIFICATION]` queda sin resolver.
