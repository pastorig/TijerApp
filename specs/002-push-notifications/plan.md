# Implementation Plan: Push Notifications

**Branch**: `002-push-notifications`
**Spec**: [spec.md](spec.md)
**Research**: [research.md](research.md)
**Created**: 2026-06-04
**Status**: Ready for tasks

## Architecture Overview

**Flow end-to-end** del MVP (solo dirección barbero):

```
1. Cliente reserva en /[slug]/reservar
   ↓
2. Insert en appointments (Supabase)
   ↓
3. Trigger Postgres: enqueue_push_for_appointment()
   • Lee push_subscriptions activas de esa barbería
   • Para cada subscription, inserta row en push_notification_queue
   ↓
4. Supabase Database Webhook detecta insert en queue
   ↓
5. POST → /api/push/send-from-queue (Vercel)
   • Auth: Bearer SUPABASE_WEBHOOK_SECRET en header
   • Body: { type: "INSERT", record: { id, subscription_id, payload, ... } }
   ↓
6. Endpoint procesa el item:
   • Lee la subscription
   • Llama webpush.sendNotification(sub, payload)
   • Update status=sent / failed / invalid según resultado
   ↓
7. Service Worker en el device del barbero recibe el push:
   • self.addEventListener('push', ...) muestra notification
   ↓
8. Barbero ve "Nueva reserva: Juan, hoy 18:30 con Carlos"
   • Tap → notificationclick handler → abre PWA en /[slug]/admin/turnero
```

**Fallback layer** (GitHub Actions cada hora):
- Llama `/api/push/cleanup` que procesa items stuck (pending > 30min) y limpia row antiguos.

**Por qué Supabase Database Webhooks**: ver [research.md Decision 2](research.md) — Vercel cron Hobby limitado a 1×/día, web push necesita latencia <60s.

## Constitution Check

| Principio | Cumple | Notas |
|---|---|---|
| Multi-tenant first | ✅ | Subscriptions aisladas por barbershop_slug + RLS estricta |
| Mobile-first | ✅ | Feature ES mobile-first por definición |
| Estética premium minimal | ✅ | UI del opt-in en settings con paleta existente |
| Spanish rioplatense | ✅ | Copy "Activar notificaciones", "Tu turno fue confirmado", etc. |
| Stack discipline | ✅ | TypeScript, App Router, Tailwind. 1 nueva dep: `web-push` (justificada en research) |
| No half-finished | ✅ | DB → endpoint → SW handlers → UI completo + tests manuales + lint/build |
| Branch workflow | ✅ | Trabajo en `002-push-notifications`, merge al final |
| Spec-driven | ✅ | Estamos en speckit flow |

**Exception**: ninguna. Plan respeta todos los principios.

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Server-side push library | `web-push` npm package (v3.x) | Estándar de-facto, sin lock-in, maneja VAPID + payload encryption |
| Scheduling strategy | Supabase Database Webhooks + queue + GitHub Actions cleanup | Vercel cron Hobby limited a daily; webhooks dan ~1-3s latency reactiva |
| VAPID keys | One-time generation + env vars | No rotation salvo breach; rotar invalida todas las subscriptions |
| Queue persistence | Supabase tabla `push_notification_queue` | Reliability via retry; trigger atómico con appointment insert |
| Service Worker | Extender `public/sw.js` existente | Reusa registration, no agregamos otro SW |
| UI ubicación opt-in | `/[slug]/admin/settings` como card nueva | Settings es donde el admin va para config técnica |
| Auth del webhook | Bearer `SUPABASE_WEBHOOK_SECRET` env var | Simple shared secret, suficiente para internal endpoint |

## File-Level Changes

### New Files

```
supabase/migrations/
└── 20260604100000_push_notifications.sql        # 2 tablas + trigger + RLS

src/lib/push/
├── vapid.ts                                     # Env vars + helpers cliente
└── subscriptions.ts                             # Lib server: insert/delete/list

src/components/push/
└── PushNotificationsCard.tsx                    # UI opt-in con 7 estados

src/lib/pwa/
└── usePushSubscription.ts                       # Hook client subscribe/unsubscribe

src/app/api/push/
├── subscribe/route.ts                           # POST: guarda subscription
├── unsubscribe/route.ts                         # DELETE: borra subscription
├── send-from-queue/route.ts                     # POST webhook handler
├── send-test/route.ts                           # POST: notif de prueba (FR-104)
└── cleanup/route.ts                             # GET: GitHub Actions fallback

scripts/
└── generate-vapid-keys.mjs                      # One-time script local

.github/workflows/
└── push-cleanup.yml                             # GitHub Actions hourly
```

### Modified Files

```
public/sw.js                                     # Add 'push' + 'notificationclick' handlers
src/components/AdminSettingsForm.tsx             # Mount <PushNotificationsCard />
package.json                                     # Add web-push dependency
```

### Deleted Files

Ninguno.

## Data Model Changes

### Migration: `20260604100000_push_notifications.sql`

```sql
begin;

-- ─── push_subscriptions ─────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expired_at timestamptz null,
  barbershop_slug text not null
    references public.barbershops(slug) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  constraint push_subscriptions_unique_endpoint_per_user
    unique (user_id, endpoint)
);

create index push_subscriptions_active_idx
  on public.push_subscriptions (barbershop_slug)
  where expired_at is null;

-- ─── push_notification_queue ────────────────────────────────────────
create table if not exists public.push_notification_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sent_at timestamptz null,
  subscription_id uuid not null
    references public.push_subscriptions(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending','sent','failed','invalid')),
  retry_count int not null default 0,
  last_error text null
);

create index push_queue_pending_idx
  on public.push_notification_queue (status, created_at)
  where status = 'pending';

-- ─── Trigger: encolar push al insert de appointment ─────────────────
create or replace function public.enqueue_push_for_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_payload jsonb;
begin
  -- Solo encolamos para reservas nuevas (no para deleted/restored)
  if new.status not in ('pending','confirmed') then
    return new;
  end if;

  -- Construimos el payload una vez
  v_payload := jsonb_build_object(
    'title', 'Nueva reserva',
    'body', format('%s · %s con %s',
                   new.customer_name,
                   to_char(new.appointment_time::time, 'HH24:MI'),
                   new.barber_name),
    'url', format('/%s/admin/turnero', new.barbershop_slug),
    'tag', format('appointment-%s', new.id)
  );

  -- Para cada subscription activa de la barbería, encolamos
  for v_sub in
    select id
    from public.push_subscriptions
    where barbershop_slug = new.barbershop_slug
      and expired_at is null
  loop
    insert into public.push_notification_queue
      (subscription_id, payload)
    values
      (v_sub.id, v_payload);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_push_for_appointment on public.appointments;
create trigger trg_enqueue_push_for_appointment
  after insert on public.appointments
  for each row
  execute function public.enqueue_push_for_appointment();

-- ─── RLS ────────────────────────────────────────────────────────────
alter table public.push_subscriptions enable row level security;
alter table public.push_notification_queue enable row level security;

-- push_subscriptions: admin ve solo las propias
drop policy if exists "push_subs_select_own" on public.push_subscriptions;
create policy "push_subs_select_own"
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "push_subs_insert_own" on public.push_subscriptions;
create policy "push_subs_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.current_user_has_barbershop_access(barbershop_slug)
);

drop policy if exists "push_subs_delete_own" on public.push_subscriptions;
create policy "push_subs_delete_own"
on public.push_subscriptions
for delete
to authenticated
using (user_id = auth.uid());

-- push_notification_queue: NO accesible salvo service role
-- (queda con RLS enabled pero sin policies = todo bloqueado por default)

commit;
```

### Supabase Database Webhook (configurado en dashboard, no en migration)

- Tabla: `push_notification_queue`
- Events: INSERT
- HTTP method: POST
- URL: `https://tijerapp.vercel.app/api/push/send-from-queue`
- Headers: `Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>`
- Configurar manualmente desde Supabase Dashboard → Database → Webhooks (no se puede automatizar en migration)

## API Surface

### POST `/api/push/subscribe`

**Auth**: Bearer access token (admin)
**Body**:
```json
{
  "barbershopSlug": "sv-barber",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": { "p256dh": "...", "auth": "..." }
  },
  "userAgent": "Mozilla/5.0 ..."
}
```
**Response**: 200 OK con `{ id }` o 4xx con `{ error }`

### DELETE `/api/push/unsubscribe`

**Auth**: Bearer access token
**Body**: `{ subscriptionId: "uuid" }` o `{ endpoint: "..." }`
**Response**: 204 No Content

### POST `/api/push/send-from-queue` (webhook handler)

**Auth**: `Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>` (env)
**Body**: Supabase webhook payload shape:
```json
{
  "type": "INSERT",
  "table": "push_notification_queue",
  "record": { ... row ... },
  "schema": "public"
}
```
**Response**: 200 OK always (no retry from Supabase side; we manage retry in DB)

### POST `/api/push/send-test`

**Auth**: Bearer access token (admin)
**Body**: `{ barbershopSlug: "sv-barber" }`
**Behavior**: encola directamente un test payload para todas las subs activas del admin caller
**Response**: 200 OK con `{ count: N }`

### GET `/api/push/cleanup` (GitHub Actions fallback)

**Auth**: `Authorization: Bearer <CRON_SECRET>` (reusa env existente)
**Behavior**:
- Procesa items pending de más de 30 min (intenta enviar)
- Marca como failed items pending de más de 24h
- Borra items sent/failed de más de 7 días
**Response**: 200 OK con `{ processed, expired, deleted }`

## UI / UX

### Component Hierarchy

```
AdminSettingsForm (modified)
└── ...existing cards...
└── PushNotificationsCard (NEW)
    └── Estado dinámico según state machine (7 estados)
```

### UI State Machine

```
                    ┌───────────────────────┐
                    │   Browser unsupported │ (no PushManager)
                    └───────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ iOS sin PWA  │      │ Permission   │      │ Activado en  │
│  instalada   │      │   default    │      │   este device│
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
  [Link a Install]      [Botón Activar]       [Notif activas]
                              │                  [Botón test]
                              ▼                  [Botón desact]
                        ┌──────────┐
                        │ Granted  │ → auto-subscribe → Activado
                        │ Denied   │ → mensaje + link a Settings browser
                        └──────────┘
```

### Component spec: `PushNotificationsCard`

Card en `AdminSettingsForm` con:
- Eyebrow gold: "Notificaciones push"
- Heading: "Recibí avisos en tiempo real"
- Descripción corta del beneficio
- Botón/state principal según state machine
- Sub-link: "¿Qué browsers soportan esto?" → tooltip con compat

## Testing Strategy

- **Lint + build verification**: `npm run lint && npm run build` clean
- **Smoke tests manuales** (orden):
  1. Generar VAPID keys local (`node scripts/generate-vapid-keys.mjs`)
  2. Agregar env vars a `.env.local` + Vercel
  3. Aplicar migration (`npm run supabase:db:push`)
  4. Configurar Supabase Database Webhook (manual desde dashboard)
  5. Login admin → settings → Activar notificaciones → grant permission
  6. Verificar row en `push_subscriptions`
  7. Botón "Mandar notif de prueba" → notif aparece en el device
  8. Crear reserva en `/[slug]/reservar` desde otra tab/incógnito
  9. Verificar row en `push_notification_queue` y notif llega en <10s
  10. Tap notif → debe abrir PWA en `/[slug]/admin/turnero`
  11. Desactivar → row en subscriptions desaparece → no más notifs
- **Edge cases a verificar**:
  - Browser sin support: el card muestra mensaje en lugar de botón
  - Permission denied: instrucciones claras
  - Multi-device: activar en mobile + desktop → ambos reciben
  - Cross-tenant: admin de sv-barber NO recibe notif de ag-barber
  - iOS Safari sin PWA installed: mensaje correcto

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Supabase Webhook layer down → notifs no llegan | Medium | GitHub Actions cron hourly `/api/push/cleanup` procesa stuck items |
| Vercel Pro plan necesario en futuro si Webhooks no escalan | Low | Solo si tenemos >1000 push/min, no en MVP |
| VAPID keys leak | High | Private key solo en Vercel env vars; nunca en repo. Rotación documentada en quickstart |
| Cliente borra PWA → subscription queda huérfana | Low | Cleanup automático al recibir 410 Gone |
| iOS Safari no muestra notifs aunque registramos | Medium | Documented: requiere PWA install. UI lo explica antes |
| Spam de notifs si entran 10 reservas en 1 min | Low | Cada notif tiene `tag` único — el browser muestra las 10 individualmente (intended behavior) |
| Service Worker push handler throw → no muestra notif | Medium | Wrap en try/catch; fallback a payload genérico si decode falla |
| User logueado en device A, después logueado como user B → A's subscription queda asociada al original user_id | Low | Aceptado: subscription es por device + user_id que la creó. Logout no la borra |
| Race condition: insert appointment + delete subscription al mismo tiempo | Low | FK CASCADE en queue cleanup; trigger SQL es atómico |

## Rollback Plan

Si la feature rompe producción:

1. **Disable webhook** desde Supabase Dashboard → no se procesan más items
2. **Revert merge commit** en main:
   ```bash
   git revert -m 1 <merge-sha>
   git push origin main
   ```
3. **Drop trigger** opcional via psql si hay impact en appointment inserts:
   ```sql
   drop trigger trg_enqueue_push_for_appointment on appointments;
   ```
4. **NO rollback de migration** necesario por default (las tablas vacías no rompen nada). Solo si queremos limpiar:
   ```sql
   drop table push_notification_queue cascade;
   drop table push_subscriptions cascade;
   drop function enqueue_push_for_appointment();
   ```
5. Subscriptions activas en el browser de barberos: tras revert, no van a recibir nada. No hace falta unregister manual.

## Quickstart (developer)

Ver [quickstart.md](quickstart.md) — pasos para correr localmente, generar VAPID, configurar webhook.

## Next Steps

- Run **speckit-tasks** para desglosar este plan en tasks dependency-ordered.
