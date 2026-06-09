-- ============================================================================
-- FIX: get_public_appointment_by_token type mismatch en service_price
-- ============================================================================
-- ERROR: 'Returned type integer does not match expected type numeric in
-- column 7' en service_price. La tabla appointments tiene service_price
-- como integer pero el RPC declaró numeric → Postgres rechaza el query.
--
-- FIX: cast explícito a numeric en service_price y final_price para que
-- ambos tipos coincidan con la firma del RPC. Mantenemos numeric en el
-- return porque discount_amount sí es numeric(10,2) y final_price hereda
-- ese tipo en el case.
-- ============================================================================

-- Drop primero para evitar conflictos de firma
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
  appointment_date date,
  appointment_time time,
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
    -- Cast explícito a numeric: la tabla appointments tiene service_price
    -- como integer pero el RPC declara numeric. Sin cast, Postgres rechaza.
    a.service_price::numeric,
    a.service_duration_minutes,
    a.appointment_date,
    a.appointment_time,
    a.comment,
    a.status::text,
    c.code as coupon_code,
    a.discount_amount,
    -- final_price = service_price - discount_amount (si hay), nunca < 0.
    -- Cast a numeric en ambos branches para que el case sea homogéneo.
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
