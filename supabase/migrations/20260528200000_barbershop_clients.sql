begin;

-- Tabla de clientes de cada barbería (identificados por teléfono normalizado).
-- Se llena automáticamente cuando se crea un appointment via trigger
-- y se actualiza con el último nombre/visita.

create table if not exists public.barbershop_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  barbershop_slug text not null,
  phone_normalized text not null,
  phone_display text not null,
  name text not null,
  notes text,
  tags text[] not null default '{}',
  deleted_at timestamptz,
  constraint barbershop_clients_unique_phone_per_barbershop
    unique (barbershop_slug, phone_normalized)
);

comment on table public.barbershop_clients is
  'Clientes únicos por barbería, identificados por teléfono normalizado. Auto-poblado al crear appointment.';

create index if not exists barbershop_clients_slug_idx
  on public.barbershop_clients (barbershop_slug)
  where deleted_at is null;

create index if not exists barbershop_clients_phone_idx
  on public.barbershop_clients (barbershop_slug, phone_normalized)
  where deleted_at is null;

create index if not exists barbershop_clients_name_idx
  on public.barbershop_clients (barbershop_slug, name)
  where deleted_at is null;

-- ─── Función de normalización de teléfono ──────────────────────────
-- Saca todos los no-dígitos. Si quedan 10+ dígitos, los devuelve.
-- Si quedan menos de 10, devuelve null (input inválido).
create or replace function public.normalize_phone(raw_phone text)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(coalesce(raw_phone, ''), '\D', '', 'g')) >= 8
      then regexp_replace(coalesce(raw_phone, ''), '\D', '', 'g')
    else null
  end;
$$;

comment on function public.normalize_phone is
  'Saca todos los no-dígitos del teléfono. Si quedan 8+ dígitos, devuelve el normalizado; sino null.';

-- ─── Trigger: upsert en clients cuando se crea/actualiza appointment
create or replace function public.sync_client_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone_normalized text;
begin
  v_phone_normalized := public.normalize_phone(new.customer_phone);
  if v_phone_normalized is null then
    return new;
  end if;

  insert into public.barbershop_clients (
    barbershop_slug,
    phone_normalized,
    phone_display,
    name,
    updated_at
  )
  values (
    new.barbershop_slug,
    v_phone_normalized,
    new.customer_phone,
    new.customer_name,
    now()
  )
  on conflict (barbershop_slug, phone_normalized) do update
  set
    -- Solo actualizamos el nombre y display si cambiaron en este turno.
    name = case
      when excluded.name is not null and excluded.name <> '' then excluded.name
      else barbershop_clients.name
    end,
    phone_display = excluded.phone_display,
    updated_at = now(),
    deleted_at = null;

  return new;
end;
$$;

drop trigger if exists trg_sync_client_from_appointment on public.appointments;
create trigger trg_sync_client_from_appointment
  after insert on public.appointments
  for each row
  execute function public.sync_client_from_appointment();

-- Backfill: poblamos clientes desde appointments existentes.
insert into public.barbershop_clients (
  barbershop_slug,
  phone_normalized,
  phone_display,
  name,
  created_at,
  updated_at
)
select distinct on (a.barbershop_slug, public.normalize_phone(a.customer_phone))
  a.barbershop_slug,
  public.normalize_phone(a.customer_phone),
  a.customer_phone,
  a.customer_name,
  min(a.created_at) over (
    partition by a.barbershop_slug, public.normalize_phone(a.customer_phone)
  ),
  now()
from public.appointments a
where a.customer_phone is not null
  and public.normalize_phone(a.customer_phone) is not null
  and a.status <> 'deleted'
order by a.barbershop_slug,
         public.normalize_phone(a.customer_phone),
         a.created_at desc
on conflict (barbershop_slug, phone_normalized) do nothing;

-- ─── RLS ────────────────────────────────────────────────────────────
alter table public.barbershop_clients enable row level security;

drop policy if exists "clients_admin_select" on public.barbershop_clients;
create policy "clients_admin_select"
on public.barbershop_clients
for select
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "clients_admin_insert" on public.barbershop_clients;
create policy "clients_admin_insert"
on public.barbershop_clients
for insert
to authenticated
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "clients_admin_update" on public.barbershop_clients;
create policy "clients_admin_update"
on public.barbershop_clients
for update
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
)
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "clients_admin_delete" on public.barbershop_clients;
create policy "clients_admin_delete"
on public.barbershop_clients
for delete
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

commit;
