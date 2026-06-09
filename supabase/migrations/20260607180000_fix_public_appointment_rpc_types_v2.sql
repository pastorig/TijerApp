-- ============================================================================
-- FIX v2: get_public_appointment_by_token type mismatches (date, time, etc.)
-- ============================================================================
-- Errores que aparecieron en cadena:
--   col 7  (service_price):   integer vs numeric
--   col 10 (appointment_time): text vs time
--   posible col 9 (appointment_date): text vs date
--
-- ESTRATEGIA: en vez de adivinar el tipo exacto de cada columna en la tabla,
-- declaramos TODOS los campos del RPC con los mismos tipos que devuelve la
-- tabla real, casteándolos a text donde sea seguro hacerlo (date/time se
-- serializan a string en el cliente de todos modos).
-- ============================================================================

drop function if exists public.get_public_appointment_by_token(text);

create or replace function public.get_public_appointment_by_token(
  p_token text
) returns table (
  id uuid,
  barbershop_slug text,
  barbershop_name text,
  barber_name text,
  customer_name text,
  service_name text,
  service_price numeric,
  service_duration_minutes int,
  appointment_date text,   -- antes: date — la tabla tiene text
  appointment_time text,   -- antes: time — la tabla tiene text
  comment text,
  status text,
  coupon_code text,
  discount_amount numeric,
  final_price numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    a.id,
    a.barbershop_slug,
    coalesce(b.name, a.barbershop_slug) as barbershop_name,
    a.barber_name,
    a.customer_name,
    a.service_name,
    a.service_price::numeric,
    a.service_duration_minutes,
    -- Cast a text por si la columna es date o text — homogeneizamos al
    -- formato que el cliente espera (YYYY-MM-DD / HH:MM:SS)
    a.appointment_date::text,
    a.appointment_time::text,
    a.comment,
    a.status::text,
    c.code as coupon_code,
    a.discount_amount,
    case
      when a.discount_amount is not null
        then greatest(0, a.service_price::numeric - a.discount_amount)
      else a.service_price::numeric
    end as final_price
  from public.appointments a
    left join public.barbershops b on b.slug = a.barbershop_slug
    left join public.coupons c on c.id = a.coupon_id
  where a.confirmation_token = p_token::uuid
  limit 1;

exception
  when invalid_text_representation then return;
end;
$$;
