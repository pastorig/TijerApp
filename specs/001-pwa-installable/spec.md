# Specification: PWA Instalable

**Branch**: `001-pwa-installable`
**Created**: 2026-06-03
**Status**: Draft
**Input**: PWA instalable para TijerApp. Objetivo: que los barberos puedan instalar la app en la pantalla de su celular (Android/iOS) o desktop y abrirla como una app nativa, sin pasar por el browser. Componentes esperados: manifest.json con metadata + icons usando el isotipo TijerApp, service worker básico con caching de assets estáticos + fallback offline mínimo, theme color matching la paleta gold/negro, apple-touch-icon para iOS Safari, install prompt customizado en mobile. Multi-tenant: barbero instala desde /[slug]/admin bookmarkea esa barbería o abre en dashboard. Cliente final puede instalar desde /[slug] landing pública para acceso rápido a reservar. Sin push notifications en este scope.

## User Scenarios & Testing

### Primary User Story

Un barbero quiere acceder a TijerApp como si fuera una app nativa en su celular: tap en el icon de su pantalla y entrar directamente al panel admin de su barbería sin pasar por el browser ni recordar la URL. El cliente final también puede instalar la landing de su barbería favorita para reservar turnos en un solo tap.

### Acceptance Scenarios

1. **Given** un barbero navegando `/sv-barber/admin` en Chrome Android, **When** el browser detecta que la app es instalable, **Then** un prompt visible (custom o nativo) le ofrece "Instalar TijerApp" con un solo tap.

2. **Given** un usuario que instaló la app, **When** tap en el icon TijerApp del home screen, **Then** la app abre en modo standalone (sin barra de URL ni chrome del browser) en menos de 2 segundos.

3. **Given** un cliente final visitando `/sv-barber` en su mobile, **When** el browser detecta installable, **Then** ve un prompt para "Guardar SV Barber en tu pantalla" desde la landing pública.

4. **Given** un usuario sin conexión a internet, **When** intenta abrir TijerApp instalado, **Then** ve una pantalla de fallback "Sin conexión" con botón "Reintentar" (NO el error genérico del browser).

5. **Given** un usuario en iOS Safari, **When** hace tap en el botón Compartir → "Agregar a inicio", **Then** el icon TijerApp aparece correctamente con el nombre "TijerApp" debajo.

6. **Given** un usuario que YA tiene la app instalada, **When** vuelve a visitar el sitio en su browser, **Then** NO se le muestra el custom install prompt de nuevo (detecta que ya está instalada).

### Edge Cases

- **Browsers sin soporte PWA** (Safari < 16.4, navegadores in-app de Instagram/Facebook): el icon y meta tags deben ser válidos pero sin install prompt visible — la experiencia degrada grácil.
- **Multi-tenant context preservation**: usuario instala desde `/sv-barber/admin`. Al abrir desde el home screen, vuelve al último contexto navegado, no al home global de TijerApp.
- **Modo incógnito**: el service worker puede no estar disponible — la app sigue funcionando como web normal sin las features PWA.
- **Primera carga vs segunda carga**: la primera visita puede ser lenta (registrando SW + cacheando); la segunda debe ser casi instantánea desde cache.
- **Updates del service worker**: cuando hay una versión nueva, el SW se actualiza silenciosamente en background — el usuario ve los cambios la próxima vez que abre la app.
- **Cache stale**: si los assets en cache están desactualizados, no debe romper la UI — el SW debe priorizar network para HTML (stale-while-revalidate).

## Functional Requirements

### Must Have (MVP)

- **FR-001**: La app debe ser detectable como instalable por browsers compatibles (Chrome ≥ 80, Edge ≥ 80, Firefox ≥ 90, Safari ≥ 16.4) cuando el usuario visita cualquier ruta de la plataforma.
- **FR-002**: El icon de la app instalada debe ser el isotipo TijerApp (T con alas en gold sobre fondo negro), en todos los tamaños requeridos por las plataformas: 192×192, 512×512 (PWA estándar), apple-touch-icon 180×180 (iOS Safari).
- **FR-003**: El nombre visible bajo el icon en el home screen debe ser "TijerApp".
- **FR-004**: La app instalada debe abrir en modo `standalone` (sin barra de URL ni chrome del browser) en Android Chrome y desktop browsers compatibles.
- **FR-005**: En iOS Safari, el icon debe verse correcto al usar "Agregar a inicio" desde el menú Compartir.
- **FR-006**: Cuando un usuario navega la app sin conexión, debe ver una página de fallback "Sin conexión" con un botón "Reintentar", en lugar del error genérico del browser ("ERR_INTERNET_DISCONNECTED").
- **FR-007**: Los assets estáticos (CSS, JS, fuentes, imágenes de UI) deben cachearse después de la primera carga para que las próximas visitas sean significativamente más rápidas.
- **FR-008**: La app debe declarar un theme color matcheando la paleta de marca (gold `#c9a23e` o negro `#0a0a0a`) para que la status bar de mobile se vea coherente con el branding.

### Should Have

- **FR-101**: Botón "Instalar app" custom visible en lugares estratégicos (footer del admin, banner en landing pública) que dispare el install dialog programáticamente. No depender solo del banner default del browser que puede estar oculto bajo el menú de 3 puntos.
- **FR-102**: Preservación del contexto multi-tenant — cuando un usuario instala desde `/[slug]/admin` o `/[slug]`, al abrir desde el home screen debe ir al último contexto navegado, no al home global de la plataforma.
- **FR-103**: Re-engagement inteligente — NO mostrar el custom install prompt si la app ya está instalada (detectar vía `display-mode: standalone` o status del `BeforeInstallPromptEvent`).
- **FR-104**: Manifest declarado correctamente y referenciado en las rutas principales para que llegue a todas las páginas relevantes.

### Won't Have (out of scope)

- **Push notifications** — fase separada (siguiente item del plan POLISH). Requiere infraestructura distinta (FCM/APN) y permisos diferentes.
- **Background sync** — no requerido en este scope; operaciones offline no son MVP.
- **Per-tenant PWA con manifest dinámico** — cada barbería NO tendrá su propio PWA independiente. Una sola "TijerApp" con context routing.
- **Offline operativo completo** — solo fallback page de "Sin conexión". Las reservas dependen de DB live; intentar offline operativo introduce conflictos de doble-booking sin valor real para el usuario.
- **Web Share API** — no necesario para esta feature.
- **UI de notificación de update del service worker** — el SW actualiza silenciosamente en background.

## Success Criteria

- **SC-001**: 80% de los barberos demo (en pruebas internas con SV Barber, AG Barber, Gino Barber) logran instalar la app desde su mobile en menos de 30 segundos sin instrucciones externas.
- **SC-002**: La primera carga de la app instalada (segunda visita en adelante) es menor a 1 segundo en una conexión 3G estándar.
- **SC-003**: La página de fallback "Sin conexión" aparece en 100% de los casos cuando no hay conexión (vs el error genérico del browser).
- **SC-004**: El score de Lighthouse PWA es ≥ 90 en producción.
- **SC-005**: El icon instalado aparece correctamente en 100% de los devices testeados (mínimo: Android Chrome, iOS Safari, Desktop Chrome, Desktop Edge).
- **SC-006**: El custom install prompt tiene tasa de click-through ≥ 15% cuando se muestra (mide cuán visible y atractivo es).

## Assumptions

- **Multi-tenant routing**: Una sola PWA "TijerApp" con preservación del último contexto navegado (deep link al `/[slug]/admin` o `/[slug]` según última visita). Razón: convención común en SaaS multi-tenant (Slack, Notion, Discord) y significativamente más simple que manifests dinámicos por tenant.
- **Offline scope**: Solo página de fallback estática "Sin conexión, reintentá cuando tengas señal". Razón: el negocio (reservas, turnos, disponibilidad) depende de DB live; intentar operaciones offline introduce riesgo de doble-booking y conflictos sin valor real para el usuario.
- **Install prompt UI**: Combinamos el prompt nativo del browser (cuando el browser lo dispara automáticamente) + un botón custom en lugares estratégicos (footer admin, banner landing pública). Razón: Chrome a veces oculta el prompt nativo o lo dispara solo después de heurísticas internas (≥ 30s en página, ≥ 2 visitas) — el botón custom le da al usuario control directo.
- **Cache strategy**: `stale-while-revalidate` para HTML (siempre fresco pero con fallback rápido), `cache-first` para assets estáticos versionados. Razón: estándar PWA, balance entre velocidad y frescura.
- **Manifest scope**: La PWA cubre toda la plataforma con `start_url: /`. Razón: alineado con el multi-tenant single-app approach.
- **Icons**: Usar el SVG existente del isotipo como base, generando los PNGs de los sizes requeridos a build-time o pre-deploy. Razón: SVG no es suficiente para algunos contextos (apple-touch-icon necesita PNG).

## Dependencies

- Isotipo TijerApp en SVG ya existente en `public/brand/icon.svg` (T con alas en gold).
- Brand colors definidos en `globals.css`: `--brand-gold #c9a23e`, fondo `#0a0a0a`.
- Plataforma de deploy actual (Vercel) — debe seguir funcionando con las nuevas rutas/headers que requiera el service worker.
- Browsers target mínimos: Chrome ≥ 80, Safari ≥ 16.4 (iOS PWA install support), Edge ≥ 80, Firefox ≥ 90.

## Next Steps

- Si quedan ambigüedades en las asunciones documentadas → run **speckit-clarify** (probablemente innecesario para esta feature).
- Si las asunciones son aceptables → run **speckit-plan** para diseñar la implementación técnica.
