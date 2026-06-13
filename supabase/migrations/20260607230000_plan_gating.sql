-- ============================================================================
-- Plan Gating — sistema de planes para TijerApp
-- ============================================================================
-- 3 tiers: solo / esencial / pro
-- Status: trial / active / grace / expired / cancelled
-- El owner del SaaS (platform_owner) asigna manualmente plan a cada barbería
-- desde /owner/planes.
--
-- Flow trial → expirado:
--   1. trial_started_at = ahora, trial_expires_at = ahora + X días
--   2. Al pasar trial_expires_at → status='grace' por 7 días más
--   3. Al pasar grace_expires_at → status='expired' (paywall completo)
--   4. El owner puede en cualquier momento setear status='active' (pagado)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type plan_tier as enum ('solo', 'esencial', 'pro');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum (
      'trial',      -- trial activo, expirá en trial_expires_at
      'active',     -- pagado, sin trial
      'grace',      -- trial expiró, sigue funcionando 7 días más
      'expired',    -- grace expiró, solo /admin/settings/plan accesible
      'cancelled'   -- owner desactivó manualmente
    );
  end if;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: barbershop_subscriptions
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.barbershop_subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null unique
    references public.barbershops(slug) on delete cascade,
  plan_tier plan_tier not null default 'pro',
  status subscription_status not null default 'trial',
  -- Trial: cuándo arrancó y cuándo expira el trial.
  -- Si status='active' (pagado), pueden ser null.
  trial_started_at timestamptz null,
  trial_expires_at timestamptz null,
  -- Grace: 7 días después de trial_expires_at, ventana antes del paywall.
  grace_expires_at timestamptz null,
  -- Período actual de billing (si pagado).
  current_period_started_at timestamptz null,
  current_period_ends_at timestamptz null,
  -- Quién asignó el plan (audit).
  assigned_by_owner_id uuid null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index para queries por status (cron de auto-expiración)
create index if not exists barbershop_subscriptions_status_idx
  on public.barbershop_subscriptions (status, trial_expires_at, grace_expires_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- BACKFILL: subscriptions para barberías existentes
-- ─────────────────────────────────────────────────────────────────────────────

-- SV Barber: Pro trial 60 días (founder customer)
insert into public.barbershop_subscriptions
  (barbershop_slug, plan_tier, status, trial_started_at, trial_expires_at, grace_expires_at, notes)
select
  slug,
  'pro'::plan_tier,
  'trial'::subscription_status,
  now(),
  now() + interval '60 days',
  now() + interval '67 days',
  'Founder customer trial extended'
from public.barbershops
where slug = 'sv-barber'
on conflict (barbershop_slug) do nothing;

-- Resto de barberías existentes: Pro trial 14 días default
insert into public.barbershop_subscriptions
  (barbershop_slug, plan_tier, status, trial_started_at, trial_expires_at, grace_expires_at)
select
  slug,
  'pro'::plan_tier,
  'trial'::subscription_status,
  now(),
  now() + interval '14 days',
  now() + interval '21 days'
from public.barbershops
where slug != 'sv-barber'
on conflict (barbershop_slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: updated_at automático
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.tr_subscriptions_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.barbershop_subscriptions;
create trigger subscriptions_set_updated_at
before update on public.barbershop_subscriptions
for each row
execute function public.tr_subscriptions_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.barbershop_subscriptions enable row level security;

-- Policy: admin de la barbería puede LEER su propia sub
drop policy if exists "subscriptions_admin_read_own" on public.barbershop_subscriptions;
create policy "subscriptions_admin_read_own"
  on public.barbershop_subscriptions for select
  to authenticated
  using (public.current_user_has_barbershop_access(barbershop_slug));

-- Policy: platform_owners pueden LEER y MODIFICAR todas
drop policy if exists "subscriptions_owner_select" on public.barbershop_subscriptions;
create policy "subscriptions_owner_select"
  on public.barbershop_subscriptions for select
  to authenticated
  using (
    exists (
      select 1 from public.platform_owners po
      where po.user_id = auth.uid()
    )
  );

drop policy if exists "subscriptions_owner_insert" on public.barbershop_subscriptions;
create policy "subscriptions_owner_insert"
  on public.barbershop_subscriptions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.platform_owners po
      where po.user_id = auth.uid()
    )
  );

drop policy if exists "subscriptions_owner_update" on public.barbershop_subscriptions;
create policy "subscriptions_owner_update"
  on public.barbershop_subscriptions for update
  to authenticated
  using (
    exists (
      select 1 from public.platform_owners po
      where po.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.platform_owners po
      where po.user_id = auth.uid()
    )
  );

grant select, insert, update on public.barbershop_subscriptions to authenticated;
