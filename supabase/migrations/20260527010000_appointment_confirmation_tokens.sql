-- BarberSync — phase 8: link público confirmar/cancelar turno via token
--
-- Objetivo:
-- Permitir que el cliente final confirme o cancele su turno via un link
-- público (sin login), enviado por WhatsApp desde el admin.
--
-- Diseño:
-- 1. Columna `confirmation_token` (uuid auto-generado) en appointments.
-- 2. RPC `get_public_appointment_by_token` para fetch del detalle (sin auth).
-- 3. RPC `confirm_appointment_by_token` y `cancel_appointment_by_token` para
--    las acciones. Ambos usan `security definer` para saltarse RLS y solo
--    permiten cambios LEGÍTIMOS (status pending → confirmed o cancelled).
-- 4. NO se exponen datos sensibles del barber/admin via el token.

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Columna confirmation_token
-- ─────────────────────────────────────────────────────────────────────────

alter table public.appointments
  add column if not exists confirmation_token uuid not null default gen_random_uuid();

create unique index if not exists appointments_confirmation_token_unique
  on public.appointments (confirmation_token);

-- ─────────────────────────────────────────────────────────────────────────
-- 2) RPC: get_public_appointment_by_token
--    Devuelve los datos visibles del turno para el cliente.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.get_public_appointment_by_token(
  p_token uuid
)
returns table (
  id uuid,
  barbershop_slug text,
  barbershop_name text,
  barber_name text,
  customer_name text,
  service_name text,
  service_price numeric,
  service_duration_minutes integer,
  appointment_date text,
  appointment_time text,
  comment text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    appointment.id,
    appointment.barbershop_slug,
    coalesce(barbershop.name, appointment.barbershop_slug) as barbershop_name,
    appointment.barber_name,
    appointment.customer_name,
    appointment.service_name,
    appointment.service_price,
    appointment.service_duration_minutes,
    appointment.appointment_date::text,
    appointment.appointment_time::text,
    appointment.comment,
    appointment.status
  from public.appointments as appointment
  left join public.barbershops as barbershop
    on barbershop.slug = appointment.barbershop_slug
  where appointment.confirmation_token = p_token
  limit 1;
$$;

revoke all on function public.get_public_appointment_by_token(uuid) from public;
grant execute on function public.get_public_appointment_by_token(uuid)
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) RPC: confirm_appointment_by_token
--    Solo permite pasar de 'pending' a 'confirmed'.
--    Otros estados (confirmed, cancelled, deleted) son no-op silencioso.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.confirm_appointment_by_token(
  p_token uuid
)
returns table (
  ok boolean,
  status text,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
begin
  select appointment.status
    into current_status
    from public.appointments as appointment
   where appointment.confirmation_token = p_token
   limit 1;

  if current_status is null then
    return query select false, null::text, 'not_found'::text;
    return;
  end if;

  if current_status = 'confirmed' then
    return query select true, current_status, 'already_confirmed'::text;
    return;
  end if;

  if current_status <> 'pending' then
    return query select false, current_status, 'invalid_state'::text;
    return;
  end if;

  update public.appointments
     set status = 'confirmed'
   where confirmation_token = p_token
     and status = 'pending';

  return query select true, 'confirmed'::text, 'ok'::text;
end;
$$;

revoke all on function public.confirm_appointment_by_token(uuid) from public;
grant execute on function public.confirm_appointment_by_token(uuid)
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4) RPC: cancel_appointment_by_token
--    Permite pasar de 'pending' o 'confirmed' a 'cancelled'.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.cancel_appointment_by_token(
  p_token uuid
)
returns table (
  ok boolean,
  status text,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
begin
  select appointment.status
    into current_status
    from public.appointments as appointment
   where appointment.confirmation_token = p_token
   limit 1;

  if current_status is null then
    return query select false, null::text, 'not_found'::text;
    return;
  end if;

  if current_status = 'cancelled' then
    return query select true, current_status, 'already_cancelled'::text;
    return;
  end if;

  if current_status not in ('pending', 'confirmed') then
    return query select false, current_status, 'invalid_state'::text;
    return;
  end if;

  update public.appointments
     set status = 'cancelled'
   where confirmation_token = p_token
     and status in ('pending', 'confirmed');

  return query select true, 'cancelled'::text, 'ok'::text;
end;
$$;

revoke all on function public.cancel_appointment_by_token(uuid) from public;
grant execute on function public.cancel_appointment_by_token(uuid)
  to anon, authenticated;

commit;
