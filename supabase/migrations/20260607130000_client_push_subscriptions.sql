-- ============================================================================
-- Client Push Subscriptions — TijerApp (FASE M)
-- ============================================================================
-- Push subscriptions de CLIENTES (visitantes anónimos) que opt-in para
-- recibir el recordatorio 24h por push en lugar de (o además de) email.
-- Linkeado al appointment vía confirmation_token (no a user_id, porque
-- los clientes no tienen cuenta).
-- ============================================================================

create table if not exists public.client_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null
    references public.appointments(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  created_at timestamptz not null default now(),
  expired_at timestamptz null,

  constraint client_push_subscriptions_appointment_endpoint_unique
    unique (appointment_id, endpoint)
);

create index if not exists client_push_subscriptions_appointment_idx
  on public.client_push_subscriptions (appointment_id)
  where expired_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC PÚBLICA: subscribe_client_push_by_token
-- ─────────────────────────────────────────────────────────────────────────────
-- Permite al cliente (sin auth) suscribirse usando su confirmation_token.
-- Valida que el token exista y crea la sub linkeada al appointment.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.subscribe_client_push_by_token(
  p_token text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
) returns table (
  success boolean,
  error_message text,
  subscription_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appointment_id uuid;
  v_subscription_id uuid;
begin
  -- Validar token
  select id into v_appointment_id
  from public.appointments
  where confirmation_token = p_token
  limit 1;

  if v_appointment_id is null then
    return query select false, 'invalid_token'::text, null::uuid;
    return;
  end if;

  -- Upsert: si ya existe, actualizar (refrescar p256dh/auth/created_at por si
  -- el browser rotó claves)
  insert into public.client_push_subscriptions
    (appointment_id, endpoint, p256dh, auth, user_agent)
  values
    (v_appointment_id, p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (appointment_id, endpoint) do update set
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    expired_at = null
  returning id into v_subscription_id;

  return query select true, null::text, v_subscription_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.client_push_subscriptions enable row level security;

-- Solo admin de la barbería del appointment puede leer
drop policy if exists "client_push_subs_admin_select"
  on public.client_push_subscriptions;
create policy "client_push_subs_admin_select"
  on public.client_push_subscriptions for select
  to authenticated
  using (
    exists (
      select 1
      from public.appointments a
      where a.id = client_push_subscriptions.appointment_id
        and public.current_user_has_barbershop_access(a.barbershop_slug)
    )
  );

-- Inserts solo via RPC SECURITY DEFINER (no via cliente directo)
-- Updates idem (rotación de keys), via RPC

grant select on public.client_push_subscriptions to authenticated;
grant execute on function
  public.subscribe_client_push_by_token(text, text, text, text, text)
  to anon, authenticated;
