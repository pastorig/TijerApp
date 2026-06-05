# Tasks: Push Notifications

**Branch**: `002-push-notifications`
**Spec**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)
**Research**: [research.md](research.md)
**Data model**: [data-model.md](data-model.md)
**Quickstart**: [quickstart.md](quickstart.md)
**Created**: 2026-06-04
**Status**: Ready for implementation

## User Stories (derivadas de spec.md)

| ID | Story | Priority | Cobertura FR |
|---|---|---|---|
| **US1** | Admin activa/desactiva notificaciones desde el panel y puede probarlas con un botón | **P1** | FR-001, FR-002, FR-009, FR-104 |
| **US2** | Cuando entra una reserva nueva, los admins suscriptos reciben la notificación en sus devices con el contenido correcto y tap abre el Turnero | **P1** | FR-003, FR-004, FR-005, FR-006, FR-007, FR-008 |

Scope MVP confirmado: solo dirección barbero. **Deferred a fase 2**: FR-101 (notif al cliente), FR-102 (toggle por barbería), FR-103 (indicador devices).

## Conventions

- Cada task: **ID + [P] paralelizable + [USN] story + descripción + file path**
- `[P]` = puede correr en paralelo con tasks marcadas [P] del MISMO phase
- `[USN]` = parte de User Story N. Setup/Foundational/Polish NO llevan story label
- Tasks marcadas **🛠 MANUAL** = acciones del user fuera del repo (Vercel dashboard, Supabase dashboard, etc.)
- Acceptance criteria al final de cada task crítica

---

## Phase 1: Setup

Trabajo de inicialización: dependencia, script de VAPID, env vars.

- [ ] T001 Install runtime dep `web-push` via `npm install web-push` + `npm install --save-dev @types/web-push` (modifica `package.json` + `package-lock.json`)
  - **Acceptance**: `npm ls web-push` no devuelve errores. Types disponibles en VS Code.

- [ ] T002 [P] Crear `scripts/generate-vapid-keys.mjs` — script Node ESM que llama a `webpush.generateVAPIDKeys()` y printea las keys formateadas para copiar al `.env.local` y Vercel. Sin side effects (solo console.log)
  - **Acceptance**: `node scripts/generate-vapid-keys.mjs` imprime `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...`, `VAPID_PRIVATE_KEY=...`, `VAPID_SUBJECT=mailto:bau.pastori@gmail.com`.

- [ ] T003 🛠 MANUAL Ejecutar `node scripts/generate-vapid-keys.mjs` localmente y agregar las 3 env vars a `.env.local`
  - **Acceptance**: `.env.local` contiene las 3 vars. Nunca se commitean (ya está en `.gitignore`).
  - **Note**: el agente NO ejecuta este step — lo hace el user para mantener el private key fuera del contexto.

- [ ] T004 🛠 MANUAL Agregar las 3 env vars VAPID a Vercel (Settings → Environment Variables, scope Production + Preview + Development)
  - **Acceptance**: las 3 vars aparecen en Vercel dashboard.

- [ ] T005 🛠 MANUAL Generar `SUPABASE_WEBHOOK_SECRET` con `openssl rand -base64 32` y agregar a `.env.local` + Vercel
  - **Acceptance**: env var en ambos lados con un valor random de 32+ chars.

---

## Phase 2: Foundational (BLOCKING)

Schema de DB + libs base. **No comenzar US1/US2 hasta completar esta phase.**

- [ ] T006 Crear `supabase/migrations/20260604100000_push_notifications.sql` con: 2 tablas (`push_subscriptions` + `push_notification_queue`), 1 trigger (`enqueue_push_for_appointment`), 4 RLS policies, 2 indexes optimizados. Schema exacto en [plan.md sección Data Model Changes](plan.md)
  - **Acceptance**: archivo SQL válido (psql syntax check).

- [ ] T007 Aplicar la migration a la DB remota corriendo `npm run supabase:db:push`
  - **Acceptance**: tablas + trigger + policies visibles en Supabase dashboard. Insertar appointment de prueba dispara el trigger sin error.
  - **Depends on**: T006

- [ ] T008 [P] Crear `src/lib/push/vapid.ts` — exporta `getPublicVapidKey()`, `getPrivateVapidKey()`, `getVapidSubject()` con SSR-safe checks (cliente expone solo la public, server expone todas). Throw error claro si la env var falta
  - **Acceptance**: importable desde client y server sin crash. Test manual: en server log, las 3 vars se leen correctas.

- [ ] T009 [P] Crear `src/lib/push/subscriptions.ts` — funciones server-side: `insertSubscription({ barbershopSlug, userId, endpoint, p256dh, auth, userAgent })`, `deleteSubscription({ userId, endpoint })`, `listActiveByBarbershop(slug): PushSubscription[]`, `markExpired(subscriptionId)`. Usa `getSupabaseAdminClient()` para bypass RLS
  - **Acceptance**: tipos exportados, funciones documentadas con JSDoc, manejo de errores con `Result<T, Error>` pattern o throw explícito.

- [ ] T010 🛠 MANUAL Configurar Supabase Database Webhook desde el dashboard:
  - Tabla: `push_notification_queue`
  - Events: INSERT (solo)
  - URL: `https://tijerapp.vercel.app/api/push/send-from-queue`
  - Header `Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>`
  - Steps detallados en [quickstart.md sección 4](quickstart.md)
  - **Acceptance**: webhook aparece en Supabase dashboard → Database → Webhooks como Active.
  - **Depends on**: T007 (la tabla debe existir)

**Checkpoint Phase 2**: con T006-T010 completos, tenemos DB + libs base + webhook listo para recibir disparos. Validar manualmente que un insert en `push_notification_queue` desde SQL editor dispara el webhook (puede dar 404 hasta US2, OK por ahora).

---

## Phase 3: User Story 1 — Opt-in / Opt-out / Test (P1)

**Goal**: El admin puede activar notificaciones desde Settings, ver el estado actual del device, mandarse una notif de prueba, y desactivar.

**Independent test**: Manual — login admin → Settings → click "Activar notificaciones" → grant browser permission → ver "Activas en este device" → click "Mandar notif de prueba" → recibir notif → click "Desactivar" → row desaparece de `push_subscriptions`.

- [ ] T011 [P] [US1] Crear `src/app/api/push/subscribe/route.ts` — POST endpoint que recibe `{ barbershopSlug, subscription: { endpoint, keys: { p256dh, auth } }, userAgent }`, valida sesión admin via `barbershop_admins`, llama `insertSubscription()` (upsert por unique constraint), devuelve `{ id }`. 401 si no auth, 403 si no es admin de esa barbería
  - **Acceptance**: integration test manual: enviar payload válido con `Authorization: Bearer <access_token>` → row en DB.

- [ ] T012 [P] [US1] Crear `src/app/api/push/unsubscribe/route.ts` — DELETE endpoint que recibe `{ endpoint }`, valida sesión, llama `deleteSubscription({ userId: auth.uid, endpoint })`, devuelve 204
  - **Acceptance**: payload + auth válido → row borrada. 401 sin auth.

- [ ] T013 [P] [US1] Crear `src/app/api/push/send-test/route.ts` — POST endpoint que recibe `{ barbershopSlug }`, valida que el caller es admin de esa barbería, lee `listActiveByBarbershop()` filtrando por `user_id = auth.uid`, encola un row en `push_notification_queue` con payload `{ title: "Prueba TijerApp", body: "Las notificaciones están funcionando ✓", url: "/${slug}/admin", tag: "test-<timestamp>" }`. Devuelve `{ enqueued: N }`
  - **Acceptance**: admin con 2 devices → enqueued=2. Insert en queue dispara el webhook (configurado en T010).

- [ ] T014 [P] [US1] Crear `src/lib/pwa/usePushSubscription.ts` — hook client que detecta el estado actual del device:
  - Feature detection: `'PushManager' in window && 'Notification' in window`
  - iOS detection y check de PWA installed
  - Permission state: `Notification.permission`
  - Subscription actual del `navigator.serviceWorker.ready.pushManager.getSubscription()`
  - Devuelve: `{ state: "unsupported" | "ios-needs-install" | "default" | "denied" | "subscribed-this-device" | "subscribed-other-device" | "granted-no-subscription"; subscribe: () => Promise<void>; unsubscribe: () => Promise<void>; sendTest: () => Promise<void> }`
  - Use `useSyncExternalStore` para evitar `set-state-in-effect` warnings
  - **Acceptance**: tipos correctos, manejo de errores, console.warn explicativos.

- [ ] T015 [P] [US1] Crear `src/components/push/PushNotificationsCard.tsx` — UI client component con las 7 visual states del hook:
  - **unsupported**: card gris con "Tu browser no soporta notificaciones"
  - **ios-needs-install**: card con link "Instalá TijerApp primero" (apunta al InstallButton del sidebar)
  - **default**: botón gold "Activar notificaciones" → llama `subscribe()`
  - **denied**: card warning con "Permiso bloqueado. Habilitalo en Configuración del navegador" + link a settings:// (no-op si no hay link, solo instrucciones)
  - **granted-no-subscription** o **subscribed-other-device**: botón gold "Activar en este dispositivo"
  - **subscribed-this-device**: ícono check verde + texto "Activas en este dispositivo" + 2 botones: "Mandar notif de prueba" (gold outline) y "Desactivar" (text-only danger)
  - Wrap en `<section>` con eyebrow gold "Notificaciones push", heading "Recibí avisos en tiempo real"
  - **Acceptance**: cada state renderea correctamente. Visual coherente con la paleta y otros cards del admin.
  - **Depends on**: T014

- [ ] T016 [US1] Modificar `src/components/AdminSettingsForm.tsx` para montar `<PushNotificationsCard barbershopSlug={barbershop.slug} />` como nueva card debajo de la última existente (ej: debajo de "Estado")
  - **Acceptance**: en `/[slug]/admin/settings` aparece el card. Estados se actualizan en vivo al hacer subscribe/unsubscribe.
  - **Depends on**: T015

**Checkpoint US1**: con T011-T016 completos, el admin puede activar/desactivar y mandarse notif de prueba. **NOTA**: el "send-test" no llega aún al device hasta que US2 (delivery pipeline) esté completo. Validar US1 con queries SQL a `push_subscriptions` y `push_notification_queue`.

---

## Phase 4: User Story 2 — Delivery Pipeline (P1)

**Goal**: Una reserva nueva dispara push notifs a todos los devices suscriptos de esa barbería en <10s. Tap abre el Turnero.

**Independent test**: Manual — admin con subscription activa → cliente reserva en `/[slug]/reservar` → admin recibe notif en <10s → tap abre `/[slug]/admin/turnero`.

- [ ] T017 [US2] Modificar `public/sw.js` para agregar handlers:
  - `self.addEventListener('push', ...)` — decodifica el payload (event.data.json()), llama `self.registration.showNotification(payload.title, { body, icon: "/brand/icons/manifest-icon-192.png", badge: "/brand/icons/manifest-icon-192.png", tag: payload.tag, data: { url: payload.url } })`
  - `self.addEventListener('notificationclick', ...)` — `event.notification.close()`, abre/foquea ventana en `event.notification.data.url` usando `clients.matchAll()` + `clients.openWindow()`
  - **Acceptance**: en DevTools → Application → Service Workers, los nuevos handlers se ven al inspect. Manual: simular push event desde DevTools → notif aparece.

- [ ] T018 [US2] Crear `src/app/api/push/send-from-queue/route.ts` — POST webhook handler:
  - Valida `Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>` desde env
  - Parsea body shape `{ type, table, record }` de Supabase webhook
  - Lee `subscription_id` del record, obtiene la subscription via admin client
  - Si `subscription.expired_at != null`, marca queue item como `invalid` y returns 200
  - Llama `webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, JSON.stringify(payload), { vapidDetails, TTL: 60 })`
  - On 410 Gone: marca subscription como `expired`, queue item como `invalid`
  - On 4xx (non-410): marca queue item como `failed` con `last_error`
  - On 5xx o network error: incrementa `retry_count`, deja como `pending` si < 3, sino `failed`
  - On success: marca queue item como `sent` con `sent_at = now()`, update `last_used_at` de subscription
  - Always returns 200 (Supabase no retry desde su lado; nosotros manejamos retry en DB)
  - **Acceptance**: insert manual en queue → webhook dispara → notif llega → row con status='sent'.

- [ ] T019 [US2] Crear `src/app/api/push/cleanup/route.ts` — GET endpoint para GitHub Actions fallback:
  - Valida `Authorization: Bearer <CRON_SECRET>` (reusa env existente)
  - Procesa queue items con `status='pending' AND created_at < now() - interval '30 minutes'`: para cada uno, llama internamente la misma lógica de send (puede deduplicar con T018 extrayendo a una función `processQueueItem(item)`)
  - Marca como `failed` items con `status='pending' AND created_at < now() - interval '24 hours'`
  - Borra rows con `status IN ('sent','failed') AND created_at < now() - interval '7 days'`
  - Borra subscriptions con `expired_at < now() - interval '30 days'`
  - Devuelve JSON `{ reprocessed, expired, deletedItems, deletedSubs }`
  - **Acceptance**: cron manual con CRON_SECRET → response 200 con counters.

- [ ] T020 [US2] Crear `.github/workflows/push-cleanup.yml` — workflow de GitHub Actions:
  - Trigger: `schedule: - cron: '0 * * * *'` (hourly) + `workflow_dispatch` (manual trigger)
  - Job: `curl -X GET https://tijerapp.vercel.app/api/push/cleanup -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"` → fail si HTTP != 200
  - **Acceptance**: workflow aparece en GitHub Actions tab. Manual run via "Run workflow" devuelve success.

**Checkpoint US2**: con T017-T020 completos, todo el delivery pipeline está activo. End-to-end test: admin con subscription → reserva en `/[slug]/reservar` → notif en <10s → tap abre Turnero.

---

## Phase 5: Polish & Verification

- [ ] T021 [P] Run `npm run lint` — 0 errors, 0 warnings.
  - **Acceptance**: exit 0.

- [ ] T022 [P] Run `npm run build` — clean.
  - **Acceptance**: exit 0, sin warnings de TypeScript ni de Web Push deprecations.

- [ ] T023 Manual smoke test completo siguiendo [`quickstart.md`](quickstart.md) sección 7 (subscribe, test, end-to-end real, multi-device, cross-tenant aislamiento, unsubscribe)
  - **Acceptance**: las 6 checks marcadas en green.

- [ ] T024 Verificar primer run del GitHub Actions cleanup workflow (esperar 1h después del merge, o ejecutar manual con "Run workflow")
  - **Acceptance**: log del workflow muestra `reprocessed: 0, expired: 0, deletedItems: 0, deletedSubs: 0` (o counts reales si hubo items stuck).

---

## Dependency Graph

```
Phase 1 (Setup):
    T001 ──→ T002 [P]
    T003, T004, T005 🛠 MANUAL (paralelo, hace el user)

Phase 2 (Foundational) — Depends on Phase 1:
    T006 ──→ T007 ──→ T010 🛠
                 ──→ T008 [P] T009 [P]

Phase 3 (US1) — Depends on Phase 2 (specifically T007+T009):
    T011 [P] T012 [P] T013 [P] T014 [P]
                                T014 ──→ T015 ──→ T016

Phase 4 (US2) — Depends on Phase 2 + needs T010 webhook configured:
    T017 [P]
    T018 ──→ T019 (extrae shared processQueueItem)
    T020 ──→ T019 (workflow llama cleanup endpoint)

Phase 5 (Polish):
    T021 [P] T022 [P] ──→ T023 ──→ T024
```

## Parallel Execution Examples

**Phase 1**: T002 puede correr en paralelo con los MANUAL T003-T005 (esos los hace el user).

**Phase 2**: T008 y T009 son `[P]` después de T007.

**Phase 3 (US1)**: T011, T012, T013, T014 son `[P]` — 4 archivos distintos. Después T015 depende de T014, y T016 de T015.

**Phase 4 (US2)**: T017 (SW handler) es `[P]` independiente. T018 y T019 deben compartir lógica.

**Phase 5**: T021 y T022 son `[P]` (independent commands).

## Implementation Strategy

### MVP rápido (recomendado)

**Phase 1+2+3** = **11 tasks de Claude** + **3 MANUAL del user**

Te da: admin puede activar/desactivar, ve el estado, manda notif de prueba (las notifs no LLEGAN aún hasta US2). Estado intermedio testeable con queries SQL.

### Recommended

**Phase 1+2+3+4** = **15 tasks Claude** + **3 MANUAL**

Te da: delivery pipeline completo end-to-end. Push notifs llegan al device del barbero cuando entran reservas.

### Full

**Phase 1-5** = **19 tasks Claude** + **3 MANUAL**

Te da: spec completa con lint+build clean, smoke tests pasando, cleanup workflow corriendo.

## Independent Test Criteria por User Story

| Story | Independent test |
|---|---|
| **US1** | Login admin → Settings → Activar notificaciones → grant permission → "Activas en este device" → click test → row en queue → row en subscriptions correcta |
| **US2** | Admin con sub activa → cliente reserva en otra tab → notif aparece en <10s → tap abre Turnero del slug correcto |

## Next Steps

- Run **speckit-analyze** (opcional) para chequeo cross-artifact de consistencia.
- Run **speckit-implement** para ejecutar las tasks (cuando tengas las 3 MANUAL listas o las hagamos en orden).
