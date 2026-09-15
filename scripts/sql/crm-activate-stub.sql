-- Esquema mínimo para probar crm_activate_barbershop en un Postgres suelto.
-- Copia las columnas reales de barbershops (20260525173000) y
-- barbershop_subscriptions (20260607230000) que la RPC usa. No es una migración.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;

create table public.barbershops (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null unique,
  name text not null
);

create type plan_tier as enum ('solo', 'esencial', 'pro');
create type subscription_status as enum ('trial', 'active', 'grace', 'expired', 'cancelled');

create table public.barbershop_subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null unique references public.barbershops(slug) on delete cascade,
  plan_tier plan_tier not null default 'pro',
  status subscription_status not null default 'trial',
  trial_started_at timestamptz null,
  trial_expires_at timestamptz null,
  grace_expires_at timestamptz null,
  current_period_started_at timestamptz null,
  current_period_ends_at timestamptz null,
  assigned_by_owner_id uuid null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
