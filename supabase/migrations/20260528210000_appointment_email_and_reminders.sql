begin;

-- ─── Email opcional en appointments ────────────────────────────────
alter table public.appointments
  add column if not exists customer_email text null;

comment on column public.appointments.customer_email is
  'Email opcional del cliente para recordatorios automáticos.';

-- ─── Email opcional en clients (sincronizado por trigger) ──────────
alter table public.barbershop_clients
  add column if not exists email text null;

-- ─── Actualizo el trigger para sincronizar email también ───────────
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
    email,
    updated_at
  )
  values (
    new.barbershop_slug,
    v_phone_normalized,
    new.customer_phone,
    new.customer_name,
    nullif(trim(new.customer_email), ''),
    now()
  )
  on conflict (barbershop_slug, phone_normalized) do update
  set
    name = case
      when excluded.name is not null and excluded.name <> '' then excluded.name
      else barbershop_clients.name
    end,
    phone_display = excluded.phone_display,
    -- Mantenemos el email viejo si en este turno no se cargó.
    email = case
      when excluded.email is not null and excluded.email <> '' then excluded.email
      else barbershop_clients.email
    end,
    updated_at = now(),
    deleted_at = null;

  return new;
end;
$$;

-- ─── Tabla de log de recordatorios enviados ────────────────────────
create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  kind text not null check (kind in ('reminder_24h', 'confirmation')),
  channel text not null check (channel in ('email', 'whatsapp')),
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent', 'failed')),
  error_message text null
);

comment on table public.reminder_log is
  'Log de recordatorios enviados automáticamente. Una fila por (appointment, kind, channel) para evitar duplicados.';

create unique index if not exists reminder_log_unique_per_appointment_kind_channel
  on public.reminder_log (appointment_id, kind, channel)
  where status = 'sent';

create index if not exists reminder_log_sent_at_idx
  on public.reminder_log (sent_at desc);

-- RLS: solo platform owners pueden leer; el cron escribe con service role.
alter table public.reminder_log enable row level security;

drop policy if exists "reminder_log_owner_select" on public.reminder_log;
create policy "reminder_log_owner_select"
on public.reminder_log
for select
to authenticated
using (public.current_user_is_platform_owner());

commit;
