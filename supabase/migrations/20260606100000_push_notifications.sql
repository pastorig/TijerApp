-- ============================================================================
-- Push Notifications — TijerApp
-- ============================================================================
-- Feature: specs/002-push-notifications/spec.md
-- Plan:    specs/002-push-notifications/plan.md
-- Date:    2026-06-06
--
-- Crea el schema necesario para Web Push Notifications:
--   1. Tabla push_subscriptions   (un device suscripto por user x barbería)
--   2. Tabla push_notification_queue (items pendientes de envío)
--   3. Trigger enqueue_push_for_appointment (encola al insertar reservas)
--   4. RLS policies y indexes optimizados
--
-- Reutiliza el helper existente `public.current_user_has_barbershop_access(text)`
-- definido en 20260525150000_phase_1_rls.sql
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: push_subscriptions
-- ─────────────────────────────────────────────────────────────────────────────
-- Representa un browser instance suscripto a notificaciones para una barbería.
-- Un user puede tener MÚLTIPLES rows (uno por device + barbería).
-- ─────────────────────────────────────────────────────────────────────────────

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

  -- Mismo device no se duplica si re-subscribe
  constraint push_subscriptions_user_endpoint_unique
    unique (user_id, endpoint)
);

-- Index para el trigger que busca subs activas de una barbería
create index if not exists push_subscriptions_barbershop_active_idx
  on public.push_subscriptions (barbershop_slug)
  where expired_at is null;

comment on table public.push_subscriptions is
  'Web Push subscriptions: un row por device+user+barbershop. expired_at IS NULL = activa.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: push_notification_queue
-- ─────────────────────────────────────────────────────────────────────────────
-- Item de notificación pendiente de enviar. Inserts disparan el Supabase
-- Database Webhook que llama a /api/push/send-from-queue.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.push_notification_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sent_at timestamptz null,

  subscription_id uuid not null
    references public.push_subscriptions(id) on delete cascade,

  payload jsonb not null,

  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'invalid')),

  retry_count int not null default 0
    check (retry_count >= 0),

  last_error text null
);

-- Index para el cleanup que busca stuck items
create index if not exists push_notification_queue_pending_idx
  on public.push_notification_queue (created_at)
  where status = 'pending';

comment on table public.push_notification_queue is
  'Cola de notificaciones push. Insert dispara Supabase Database Webhook → /api/push/send-from-queue.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: enqueue_push_for_appointment
-- ─────────────────────────────────────────────────────────────────────────────
-- AFTER INSERT en appointments: encola un push para cada subscription activa
-- de la barbería. Filtra por status válido (pending/confirmed, no canceladas).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.enqueue_push_for_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_barber_name text;
  v_service_name text;
  v_client_name text;
  v_time_label text;
  v_payload jsonb;
  v_sub record;
begin
  -- No-op si la reserva no es activa (cancelada, etc.)
  if NEW.status not in ('pending', 'confirmed') then
    return NEW;
  end if;

  -- Buscar datos para construir el body de la notificación
  select b.name into v_barber_name
    from public.barbers b
    where b.id = NEW.barber_id;

  select bs.name into v_service_name
    from public.barber_services bs
    where bs.id = NEW.barber_service_id;

  -- v_client_name: primer nombre, fallback a "Cliente"
  v_client_name := coalesce(
    split_part(NEW.customer_name, ' ', 1),
    'Cliente'
  );

  -- v_time_label: "HH:MM" del appointment_time
  v_time_label := to_char(NEW.appointment_time, 'HH24:MI');

  -- Payload base — el body se ajusta según data disponible
  v_payload := jsonb_build_object(
    'title', 'Nueva reserva',
    'body',
      v_client_name
      || ' · ' || v_time_label
      || coalesce(' con ' || v_barber_name, '')
      || coalesce(' · ' || v_service_name, ''),
    'url', '/' || NEW.barbershop_slug || '/admin/turnero',
    'tag', 'appointment-' || NEW.id::text
  );

  -- Encolar para cada subscription activa de la barbería
  for v_sub in
    select id
      from public.push_subscriptions
      where barbershop_slug = NEW.barbershop_slug
        and expired_at is null
  loop
    insert into public.push_notification_queue (subscription_id, payload, status)
      values (v_sub.id, v_payload, 'pending');
  end loop;

  return NEW;
end;
$$;

-- Drop si existe (re-runs idempotentes)
drop trigger if exists enqueue_push_for_appointment_trigger on public.appointments;

create trigger enqueue_push_for_appointment_trigger
  after insert on public.appointments
  for each row
  execute function public.enqueue_push_for_appointment();

comment on function public.enqueue_push_for_appointment() is
  'Trigger AFTER INSERT en appointments: encola push notifications para todas las subs activas de la barbería.';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.push_subscriptions enable row level security;
alter table public.push_notification_queue enable row level security;

-- push_subscriptions: el user solo ve/inserta/borra SUS rows
drop policy if exists "push_subscriptions_user_select_own" on public.push_subscriptions;
create policy "push_subscriptions_user_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_subscriptions_user_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_user_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_has_barbershop_access(barbershop_slug)
  );

drop policy if exists "push_subscriptions_user_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_user_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- push_notification_queue: bloqueado para authenticated (las updates las hace
-- service_role desde el processor; los inserts vienen del trigger SECURITY DEFINER)
-- RLS enabled sin policies = deniega todo a authenticated/anon.
-- service_role bypasea RLS por default en Supabase.

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

-- authenticated puede operar sobre push_subscriptions (limitado por RLS arriba)
grant select, insert, delete on public.push_subscriptions to authenticated;

-- push_notification_queue: solo service_role (queda implicito por default)
-- (no grants a authenticated → no acceso)
