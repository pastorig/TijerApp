-- ============================================================================
-- FIX: get_public_appointment_by_token devuelve info de cupón aplicado
-- ============================================================================
-- Para que /r/[token] muestre el precio final con descuento, el RPC público
-- debe devolver coupon_code + discount_amount + final_price. Antes solo
-- devolvía service_price (sin descuento).
-- ============================================================================

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
  -- NUEVOS: campos del cupón aplicado al reservar (null si no se aplicó)
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
    a.service_price,
    a.service_duration_minutes,
    a.appointment_date,
    a.appointment_time,
    a.comment,
    a.status::text,
    c.code as coupon_code,
    a.discount_amount,
    -- final_price = service_price - discount_amount (si hay), nunca < 0
    case
      when a.discount_amount is not null
        then greatest(0, a.service_price - a.discount_amount)
      else a.service_price
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
