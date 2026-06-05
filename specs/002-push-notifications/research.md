# Research: Push Notifications

**Feature**: [spec.md](spec.md)
**Phase**: 0 (Research)
**Date**: 2026-06-04

## Decision 1: Push delivery library (server-side)

**Chosen**: `web-push` npm package (v3.x)

**Rationale**:
- Estándar de-facto para Web Push Protocol (RFC 8030) en Node.js
- Maneja firma VAPID (JWT-based), payload encryption (RFC 8291), TTL headers
- API minimalista: `webpush.sendNotification(subscription, payload, options)`
- Mantenido activamente, ~3M descargas semanales
- Sin lock-in, sin tracking, sin cuenta third-party
- Bundle size aceptable (~50KB)
- Compatible con Node 18+ (Vercel runtime)

**Alternatives considered**:
- `@firebase/messaging` (FCM): requiere proyecto Firebase, lock-in, tracking de Google, en iOS bajo el capó usa Web Push igual. Overkill para nuestro scale.
- `node-pushnotifications`: wrapper sobre web-push + APN + GCM. Innecesario porque nuestro target es solo Web Push.
- Implementación manual: ~300 LOC para JWT firmado + ECDH + AES-GCM. Reinventar la rueda.

## Decision 2: Scheduling strategy

**Chosen**: **Supabase Database Webhooks** disparan procesamiento reactivo al insert de appointment, con queue table en Supabase para reliability.

**Rationale**:
- **Vercel cron en Hobby plan está limitado a 1 ejecución por día** — no sirve para latencia 30-60s.
- TijerApp ya usa **GitHub Actions cada hora** para reminders (verificado en `src/app/api/cron/reminders/route.ts` línea 24). Vercel tiene 0 cron jobs configurados actualmente.
- Supabase Database Webhooks: dispara HTTP request a un endpoint nuestro cuando hay insert/update/delete en una tabla. Built-in en Supabase (free tier).
- Latencia esperada: **~1-3 segundos** desde insert del appointment hasta llegada de la notif (mejor que los 30-60s target del spec).
- La reliability se mantiene con una **queue table**: el trigger SQL inserta items en `push_notification_queue` ANTES de que el webhook se dispare. Si el webhook falla, los items quedan pendientes en la queue para retry.

**Alternatives considered**:
- **Vercel Pro plan ($20/mes)** + Vercel cron cada 30s: viable técnicamente pero implica pagar antes de tener barberos reales. Postpone hasta que haya ARR.
- **GitHub Actions cada 1 minuto**: posible pero GitHub Actions tiene rate limits (1000 min/mes en free tier) y cron de 1 min costaría ~1440 min/día = excede límite.
- **Inngest / QStash / Trigger.dev**: plataformas dedicadas. Excelentes pero introducen nueva dep + cuenta + posible costo. Innecesarias para nuestro scale.
- **Webhook directo desde trigger sin queue**: simple pero perdés notifs si el webhook endpoint falla. La queue es la diferencia entre "fire and forget" y "garantizado".

**Trade-off aceptado**: dependencia de Supabase Database Webhook layer. Si Supabase está down, no se disparan. Mitigación: GitHub Actions cron diario que procesa items stuck (>1h pendientes) como fallback.

## Decision 3: VAPID keys generation

**Chosen**: script one-time + env vars

**Rationale**:
- Generamos las VAPID keys una sola vez con un script local (no en build).
- Public key se expone al frontend (necesaria para `pushManager.subscribe()`).
- Private key vive como env var en Vercel server-side only.
- Una vez generadas, NO se rotan a menos que haya breach — rotarlas invalida TODAS las subscriptions activas (todos los barberos se desuscriben de golpe).
- Comando: `npx web-push generate-vapid-keys` (incluido en el package web-push).

**Env vars**:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: pública (expuesta al cliente)
- `VAPID_PRIVATE_KEY`: privada (solo server)
- `VAPID_SUBJECT`: `mailto:bau.pastori@gmail.com` (required by spec, identifica al sender)

## Decision 4: Schema strategy

**Chosen**: 2 tablas + 1 trigger + 2 RLS policies + 1 webhook

**`push_subscriptions`** — devices suscriptos:
- `id uuid pk`
- `barbershop_slug text not null references barbershops(slug) on delete cascade`
- `user_id uuid references auth.users(id) on delete cascade` (admin)
- `endpoint text not null` (URL del push service del browser)
- `p256dh text not null` (key de cifrado)
- `auth text not null` (auth secret)
- `created_at, last_used_at timestamps`
- `expired_at timestamp nullable` — marca cuando detectamos 410 Gone
- Unique constraint: `(user_id, endpoint)` — mismo device no se duplica

**`push_notification_queue`** — items pendientes de enviar:
- `id uuid pk`
- `subscription_id uuid references push_subscriptions(id) on delete cascade`
- `payload jsonb not null` — `{ title, body, url, tag }`
- `status text not null check (status in ('pending','sent','failed','invalid'))`
- `retry_count int not null default 0`
- `created_at, sent_at timestamps`

**Trigger**: en `appointments` AFTER INSERT — para cada subscription activa de esa barbería, inserta un row en `push_notification_queue` con el payload.

**RLS**:
- `push_subscriptions`: admin solo ve sus propias subscriptions (`user_id = auth.uid()`). Solo puede insert/delete las propias.
- `push_notification_queue`: NO accesible desde anon/authenticated (solo service role del processor).

## Decision 5: UI flow del opt-in

**Chosen**: botón con 5 estados visibles

| Estado | UI shown |
|---|---|
| Browser unsupported | Botón disabled + tooltip "Tu browser no soporta notificaciones push" |
| iOS sin PWA instalada | Banner "Instalá TijerApp en tu pantalla primero" → link a InstallButton |
| Permission default (nunca pedido) | Botón gold "Activar notificaciones" |
| Permission denied | Mensaje + link a settings del browser "Permitilo desde Configuración del navegador" |
| Permission granted, sin subscription | Auto-subscribe + state update |
| Subscribed actual device | Texto "Notificaciones activas en este dispositivo" + botón Desactivar |
| Subscribed otro device (no este) | Texto "Activas en otro dispositivo. Activar también en este" |

Ubicación: en `/[slug]/admin/settings` como nueva card, debajo de "Configuración general".

## Decision 6: Service Worker push handler

**Chosen**: extender `public/sw.js` con handlers `push` y `notificationclick`

**Rationale**:
- Reusa el SW que ya tenemos (sin agregar otro registration).
- `push` event handler decodifica el payload y muestra la notificación via `self.registration.showNotification()`.
- `notificationclick` handler abre/foquea la PWA en la URL del payload (`url` field).

**Payload format**:
```json
{
  "title": "Nueva reserva",
  "body": "Juan Pérez · hoy 18:30 con Carlos",
  "url": "/sv-barber/admin/turnero",
  "tag": "appointment-<appointment_id>"
}
```

El `tag` evita duplicados si el mismo evento se dispara 2 veces (la 2da reemplaza la 1ra en la notification tray).

## Decision 7: Retry strategy

**Chosen**: máximo 3 retries con backoff exponencial — 0s, 30s, 300s

**Rationale**:
- 410 Gone (subscription muerta): NO retry, marca como `invalid` y elimina row.
- 4xx errors generales: NO retry (error de payload/auth, no se va a arreglar solo).
- 5xx + network timeouts: 3 retries (inmediato, 30s después, 5min después).
- Después de 3 fails, marca como `failed` y queda para inspección manual (Sentry alert).

## Decision 8: GitHub Actions fallback cleanup

**Chosen**: cron horario que procesa items stuck

**Rationale**:
- Si Supabase Webhook falla por cualquier razón, los items quedan en `pending` indefinidamente.
- Una vez por hora, GitHub Actions llama a `/api/push/cleanup` que:
  - Procesa items pending de más de 30 min
  - Marca como `failed` items pending de más de 24h
  - Borra items `sent` o `failed` de más de 7 días (housekeeping)

## Resolved unknowns

| Original ambiguity | Resolution |
|---|---|
| Library para enviar push | `web-push` npm package |
| Cómo schedule el processing | Supabase Database Webhooks reactivos + queue + GitHub Actions cleanup |
| Vercel cron limit | NO se usa Vercel cron — workaround con webhooks |
| VAPID keys storage | env vars (one-time generation) |
| Schema exacto | 2 tablas + trigger + RLS + webhook |
| UI states del botón | 7 estados explícitos |
| Retry strategy | 3 retries exponenciales, 410 → invalid permanent |
| Service Worker handlers | Extender `public/sw.js` con push + notificationclick |

Ningún `[NEEDS CLARIFICATION]` queda sin resolver.
