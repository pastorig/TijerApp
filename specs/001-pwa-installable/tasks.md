# Tasks: PWA Instalable

**Branch**: `001-pwa-installable`
**Spec**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)
**Research**: [research.md](research.md)
**Created**: 2026-06-03
**Status**: Ready for implementation

## User Stories (derivadas de spec.md)

| ID | Story | Priority | Cobertura FR |
|---|---|---|---|
| **US1** | Usuario instala TijerApp → tap icon → app abre en standalone y vuelve al último contexto navegado (`/[slug]/admin` o `/[slug]`) | **P1** | FR-001..005, FR-008, FR-102 |
| **US2** | Usuario sin conexión ve página `/offline` en lugar del error genérico del browser | **P1** | FR-006, FR-007 |
| **US3** | Botón "Instalar app" custom + tooltip iOS + re-engagement inteligente (no mostrar si ya instalada) | **P2** | FR-101, FR-103, FR-104 |

## Conventions

- Cada task tiene **ID + paralelizable [P] + story [US?] + descripción + file path**.
- `[P]` = puede correr en paralelo con tasks marcadas [P] del MISMO phase.
- `[USN]` = parte de User Story N. Setup/Foundational/Polish no llevan story label.
- Acceptance criteria al final de cada task crítica (no obvia).

---

## Phase 1: Setup

Trabajo de inicialización: dependencias, assets, config.

- [ ] T001 Install runtime deps `@serwist/next` y `serwist` via `npm install @serwist/next serwist` (modifica `package.json` + `package-lock.json`)
  - **Acceptance**: `npm ls @serwist/next serwist` no devuelve errores. `package.json` lista ambas en `dependencies`.

- [ ] T002 [P] Generate PWA icon PNGs desde el SVG existente corriendo `npx pwa-asset-generator public/brand/icon.svg public/brand/icons --background "#0a0a0a" --padding "10%" --maskable false --manifest false --type png`
  - **Output**: `public/brand/icons/manifest-icon-192.maskable.png`, `manifest-icon-512.maskable.png`, `apple-icon-180.png` (nombres exactos dependen de la versión del tool — commiteamos lo que genere)
  - **Acceptance**: existen los 3 sizes mínimos (192, 512, 180). Visual check de cada uno (el isotipo se ve completo, no recortado).

- [ ] T003 Modificar `next.config.ts` para wrappear el export default con `withSerwist({ swSrc: "app/sw.ts", swDest: "public/sw.js", disable: process.env.NODE_ENV === "development" })`
  - **Acceptance**: `npm run build` no rompe (puede dar warning de SW faltante hasta T013, OK por ahora).
  - **Note**: `disable: true` en dev evita que serwist interfiera con HMR.

---

## Phase 2: Foundational (BLOCKING)

Prerequisitos compartidos por todas las User Stories. **No comenzar US1/US2/US3 hasta completar esta phase.**

- [ ] T004 Crear `app/manifest.ts` exportando default un objeto MetadataRoute.Manifest con: `name="TijerApp"`, `short_name="TijerApp"`, `description="Turnos online para barberías modernas"`, `start_url="/?source=pwa"`, `scope="/"`, `display="standalone"`, `background_color="#0a0a0a"`, `theme_color="#c9a23e"`, `lang="es-AR"`, `icons` apuntando a los PNGs de `/brand/icons/`
  - **Acceptance**: navegar `/manifest.webmanifest` en dev devuelve el JSON válido.

- [ ] T005 [P] Crear `src/lib/pwa/last-context.ts` con helpers: `getLastContext(): { slug: string | null; role: "admin" | "public" | null }`, `setLastContext(slug: string, role: "admin" | "public"): void`, `clearLastContext(): void`. Usa `localStorage` con prefix `tijerapp:`. SSR-safe (verifica `typeof window`).
  - **Acceptance**: importable desde server components sin crash. Cuando se llama en cliente, lee/escribe localStorage correctamente.

- [ ] T006 [P] Crear `src/lib/pwa/useStandaloneMode.ts` exportando `useStandaloneMode(): boolean` que devuelve true si `display-mode: standalone` matches o si `navigator.standalone === true` (iOS legacy)
  - **Acceptance**: en dev browser tab devuelve false. Cuando se instala como PWA, devuelve true.

---

## Phase 3: User Story 1 — Install + Last Context Routing (P1)

**Goal**: Un barbero/cliente puede instalar TijerApp y al tap del icon vuelve al último contexto navegado.

**Independent test**: Manual — navegar `/sv-barber/admin` → cerrar tab → instalar PWA → tap icon → debe abrir directo en `/sv-barber/admin` (no en `/`).

- [ ] T007 [P] [US1] Crear `src/lib/pwa/PWAInstallProvider.tsx` — Context Provider client component que captura `beforeinstallprompt`, expone `{ isInstallable: boolean; isInstalled: boolean; promptInstall(): Promise<"accepted"|"dismissed"> }`. Escucha también `appinstalled` event para marcar `isInstalled=true`.
  - **Acceptance**: En Chrome desktop con la app deployada cumpliendo PWA criteria, `isInstallable` flips a true después de ~30s en página.

- [ ] T008 [P] [US1] Modificar `src/app/layout.tsx` para:
  1. Wrap children con `<PWAInstallProvider>` (cliente).
  2. Agregar en `<head>` (via metadata Next 16): `themeColor: "#c9a23e"`, `appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TijerApp" }`.
  3. Agregar `<link rel="apple-touch-icon" href="/brand/icons/apple-icon-180.png" />` (vía metadata.icons.apple).
  - **Acceptance**: en DevTools → Elements → `<head>` muestra los meta apple + theme-color. Provider rodea el render.

- [ ] T009 [P] [US1] Crear `src/hooks/useLastContextTracker.ts` — hook client-only que recibe `(slug: string, role: "admin" | "public")` y llama `setLastContext(slug, role)` cada vez que `slug` cambia. Usa `useEffect` con `[slug, role]` como deps.
  - **Acceptance**: navegando entre barberías, localStorage refleja el último slug visitado.

- [ ] T010 [US1] Modificar `src/components/PublicBarbershopLanding.tsx` para llamar `useLastContextTracker(barbershop.slug, "public")` al top del componente
  - **Acceptance**: visitar `/sv-barber` setea `tijerapp:last_slug=sv-barber`, `last_role=public` en localStorage.
  - **Depends on**: T009

- [ ] T011 [US1] Modificar `src/components/admin/AdminShell.tsx` (o el componente equivalente que envuelve el admin layout) para llamar `useLastContextTracker(barbershopSlug, "admin")`. Si no existe AdminShell, crearlo o agregar en `src/components/AdminAppointments.tsx` o donde mejor encaje el ciclo de vida.
  - **Acceptance**: visitar `/sv-barber/admin` setea `last_role=admin`.
  - **Depends on**: T009
  - **Note**: explorar primero la estructura del admin para decidir el mejor lugar — speckit-implement evaluará si conviene crear AdminShell o instrumentar el existente.

- [ ] T012 [US1] Modificar `src/app/page.tsx` para que sea Client Component que, on mount, lea `getLastContext()` y si `slug != null` haga `router.replace(role === "admin" ? "/${slug}/admin" : "/${slug}")`. Solo redirigir si `searchParams.source === "pwa"` o `useStandaloneMode() === true` (no redirigir cuando el usuario viene del browser a la landing comercial).
  - **Acceptance**:
    - Navegar `/` desde browser → ve la landing comercial (no redirige).
    - Abrir PWA → `/?source=pwa` → si hay last_context, redirige.
  - **Depends on**: T005, T006

- [ ] T013 [US1] Crear `app/sw.ts` con configuración base de serwist: import `defaultCache` de `serwist/next/worker`, exportar service worker que precachea `self.__SW_MANIFEST` y registra `defaultCache` runtime caching.
  - **Acceptance**: `npm run build` genera `public/sw.js`. Al levantar `npm start`, DevTools → Application → Service Workers muestra el SW activo.

**Checkpoint US1**: con T007-T013 completos, la PWA es instalable y al tap del icon respeta el último contexto. Validar con el independent test antes de pasar a US2.

---

## Phase 4: User Story 2 — Offline Fallback (P1)

**Goal**: Sin conexión, el usuario ve `/offline` (no el error genérico del browser).

**Independent test**: DevTools → Network → Offline → recargar cualquier ruta → debe mostrar la página offline con isotipo + botón Reintentar.

- [ ] T014 [US2] Crear `app/offline/page.tsx` — server component estático con:
  - Isotipo TijerApp grande (reusa `<Logo variant="mark" size="xl" />`)
  - Heading "Sin conexión" font-black uppercase
  - Texto "Volvé a intentar cuando tengas señal de internet"
  - Botón "Reintentar" que hace `window.location.reload()` (client component pequeño)
  - Layout fullscreen oscuro, mobile-first centered
  - **Acceptance**: navegar `/offline` directamente muestra la página. Lighthouse no falla.

- [ ] T015 [US2] Extender `app/sw.ts` (T013) para configurar offline fallback: agregar handler que en navigate requests fallidas devuelva `caches.match("/offline")`. Asegurar que `/offline` esté en el precache list (via `self.__SW_MANIFEST` que serwist arma de las rutas estáticas).
  - **Acceptance**: con SW activo + offline en DevTools, cualquier navegación devuelve `/offline`.
  - **Depends on**: T013, T014

**Checkpoint US2**: con T014-T015, offline fallback funciona. Test con DevTools offline.

---

## Phase 5: User Story 3 — Custom Install UX (P2)

**Goal**: Botón "Instalar app" custom visible en lugares estratégicos + tooltip iOS + re-engagement inteligente.

**Independent test**: en Chrome desktop con la app deployada, el botón "Instalar app" aparece en footer admin y banner en landing. Click → install dialog. En iOS Safari, el botón muestra tooltip con instrucciones.

- [ ] T016 [P] [US3] Crear `src/lib/pwa/useInstallPrompt.ts` — hook que consume `PWAInstallProvider` context y expone `{ canInstall: boolean; isiOS: boolean; promptInstall(): Promise<"accepted"|"dismissed">; }`. `canInstall` es true si `(isInstallable && !isInstalled) || isiOS`. `isiOS` detecta `/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream`.
  - **Acceptance**: en Chrome desktop con app installable, `canInstall=true`. En desktop con app already-installed, `canInstall=false`. En iOS Safari, `isiOS=true` siempre.

- [ ] T017 [P] [US3] Crear `src/components/pwa/InstallButton.tsx` — botón discreto "Instalar app" que llama `promptInstall()`. Si `isiOS`, abre `iOSInstallTooltip` (T019) en lugar de prompt nativo. Si `!canInstall`, no renderiza nada (`return null`).
  - **Variantes via props**: `variant: "footer-admin" | "banner-landing"` cambia estilos (footer = botón discreto, banner = más prominente).
  - **Acceptance**: visible solo cuando `canInstall=true`.

- [ ] T018 [P] [US3] Crear `src/components/pwa/InstallBanner.tsx` — banner mobile-only (`md:hidden`) que muestra "Guardá [Nombre Barbería] en tu pantalla" con CTA InstallButton + botón cerrar (×). Al cerrar guarda `tijerapp:install_banner_dismissed=<timestamp>` en localStorage. Solo se muestra si: `canInstall && !isInstalled && (no dismissed) || (dismissed > 30 días)`.
  - **Acceptance**: dismiss persiste 30 días. Re-mount muestra el banner si: nueva visita, o pasaron 30+ días desde dismiss.

- [ ] T019 [P] [US3] Crear `src/components/pwa/iOSInstallTooltip.tsx` — modal/tooltip que se abre desde el InstallButton en iOS. Muestra ilustración: "Tocá el botón Compartir ↑ → seleccioná 'Agregar a inicio'". Usa el ConfirmDialog pattern del proyecto o uno simple inline.
  - **Acceptance**: en iOS muestra contenido legible. En desktop nunca aparece (porque `isiOS=false`).

- [ ] T020 [US3] Wire `<InstallButton variant="footer-admin" />` dentro del footer/sidebar del admin layout (decidir ubicación exacta al inspeccionar la jerarquía actual del admin).
  - **Acceptance**: en `/sv-barber/admin/*` el botón aparece (cuando installable).
  - **Depends on**: T017

- [ ] T021 [US3] Wire `<InstallBanner barbershopName={barbershop.name} />` en `src/components/PublicBarbershopLanding.tsx` cerca del hero (mobile only).
  - **Acceptance**: en `/sv-barber` mobile el banner aparece. En desktop no.
  - **Depends on**: T018

**Checkpoint US3**: con T016-T021, install UX completo: botón footer admin + banner landing + tooltip iOS + re-engagement.

---

## Phase 6: Polish & Cross-Cutting

Verificación final antes del merge.

- [ ] T022 [P] Run `npm run lint` — 0 errors, 0 warnings.
  - **Acceptance**: exit 0.

- [ ] T023 [P] Run `npm run build` — clean.
  - **Acceptance**: exit 0, sin warnings de PWA.

- [ ] T024 Manual smoke test seguir [`quickstart.md`](quickstart.md) sección 1-7 (manifest válido, SW registra, install desktop/Android/iOS, offline fallback, last-context routing)
  - **Acceptance**: las 7 checks marcadas en green.

- [ ] T025 Lighthouse PWA audit en producción (Vercel preview deploy) — score ≥ 90, idealmente ≥ 95
  - **Acceptance**: report exportado/screenshoteado en el PR.

- [ ] T026 Verificar que el isotipo se ve bien a 16px favicon size después del deploy (browser tab + bookmarks)
  - **Acceptance**: visual check. Si se ve pixelado, regenerar con `--padding "5%"` y T002 redo.

---

## Dependency Graph

```
Phase 1 (Setup): T001 ──→ T002 [P] T003

Phase 2 (Foundational):
    Depends on Phase 1
    T004 ──→ T005 [P] T006

Phase 3 (US1) — Depends on Phase 2:
    T007 [P] T008 [P] T009 ──→ T010 [P] T011
                            ──→ T012
                            ──→ T013

Phase 4 (US2) — Depends on Phase 2 (and T013 from US1):
    T014 ──→ T015

Phase 5 (US3) — Depends on Phase 2:
    T016 [P] T017 [P] T018 [P] T019 ──→ T020 [P] T021

Phase 6 (Polish):
    T022 [P] T023 [P] T024 ──→ T025 ──→ T026
```

## Parallel Execution Examples

**Phase 1**: T002 puede correr en paralelo con T003 mientras T001 termina.

**Phase 2**: T005 y T006 pueden correr en paralelo después de T004.

**Phase 3 (US1)**: T007, T008, T009 son `[P]` — el provider, el layout y el tracker hook son archivos distintos.

**Phase 5 (US3)**: T016, T017, T018, T019 son `[P]` — 4 archivos distintos creados en paralelo. Luego T020 y T021 son `[P]` entre ellos (wire en archivos distintos).

**Phase 6**: T022 y T023 son `[P]` (independent commands).

## Implementation Strategy

### MVP Scope (recommended)

Si vas con tiempo justo y querés un MVP funcional al final del día:

- **Phase 1, 2, 3** (Setup + Foundational + US1) = **13 tasks**
- Resultado: PWA instalable, multi-tenant con last-context. **Sin offline, sin custom button**.
- Lo más visible para el usuario final: el icon en home screen + standalone mode.

### Extended Scope (recommended next)

- + **Phase 4** (US2 Offline) = **15 tasks total**
- Resultado: MVP + offline fallback. Cubre los 2 user stories P1.

### Full Scope

- + **Phase 5, 6** (US3 + Polish) = **26 tasks total**
- Resultado: feature completa según spec, lista para producción.

## Independent Test Criteria por User Story

| Story | Independent test |
|---|---|
| **US1** | Navegar `/sv-barber/admin` → cerrar tab → instalar PWA → tap icon → abre directo en `/sv-barber/admin` |
| **US2** | DevTools → Network → Offline → recargar cualquier ruta → muestra `/offline` con isotipo + Reintentar |
| **US3** | Footer del admin muestra "Instalar app" (cuando installable) → click → install dialog. iOS muestra tooltip de instrucciones manuales |

## Next Steps

- Run **speckit-analyze** (opcional) para chequeo cross-artifact de consistencia.
- Run **speckit-implement** para ejecutar las tasks una por una.
