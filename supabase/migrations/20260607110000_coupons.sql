-- ============================================================================
-- Coupons — TijerApp (FASE C feature Pro)
-- ============================================================================
-- Cupones de descuento aplicables en booking. Por barbería. Soporta:
--   - discount_type: 'percent' (0-100) o 'fixed' (monto ARS)
--   - valid_from / valid_until (opcionales)
--   - usage_limit (opcional, NULL = ilimitado)
--   - usage_count (auto-incrementa al aplicar)
-- ============================================================================

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null
    references public.barbershops(slug) on delete cascade,
  code text not null,
  description text null,
  discount_type text not null
    check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10, 2) not null
    check (discount_value > 0),
  valid_from timestamptz null,
  valid_until timestamptz null,
  usage_limit int null check (usage_limit is null or usage_limit > 0),
  usage_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 1 código único por barbería (case-insensitive)
  constraint coupons_unique_code_per_barbershop unique (barbershop_slug, code)
);

-- Index para buscar rápido un cupón activo por código + barbería
create index if not exists coupons_active_lookup_idx
  on public.coupons (barbershop_slug, code)
  where is_active = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: validate_coupon_for_booking
-- ─────────────────────────────────────────────────────────────────────────────
-- Valida un código de cupón ANTES de aplicarlo. Devuelve los datos para
-- calcular el descuento en el cliente (no aplicar acá — eso se hace cuando
-- se confirma la reserva). Permite preview en booking form.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.validate_coupon_for_booking(
  p_barbershop_slug text,
  p_code text,
  p_service_price numeric default null
) returns table (
  is_valid boolean,
  error_code text,
  coupon_id uuid,
  discount_type text,
  discount_value numeric,
  discount_amount numeric,
  final_price numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coupon record;
  v_now timestamptz := now();
  v_discount numeric := 0;
  v_final numeric := null;
begin
  -- Lookup case-insensitive
  select c.id, c.discount_type, c.discount_value, c.valid_from,
         c.valid_until, c.usage_limit, c.usage_count, c.is_active
  into v_coupon
  from public.coupons c
  where c.barbershop_slug = p_barbershop_slug
    and upper(c.code) = upper(p_code);

  if not found then
    return query select false, 'not_found'::text, null::uuid,
                        null::text, null::numeric, null::numeric, null::numeric;
    return;
  end if;

  if not v_coupon.is_active then
    return query select false, 'inactive'::text, v_coupon.id,
                        null::text, null::numeric, null::numeric, null::numeric;
    return;
  end if;

  if v_coupon.valid_from is not null and v_now < v_coupon.valid_from then
    return query select false, 'not_yet_valid'::text, v_coupon.id,
                        null::text, null::numeric, null::numeric, null::numeric;
    return;
  end if;

  if v_coupon.valid_until is not null and v_now > v_coupon.valid_until then
    return query select false, 'expired'::text, v_coupon.id,
                        null::text, null::numeric, null::numeric, null::numeric;
    return;
  end if;

  if v_coupon.usage_limit is not null
     and v_coupon.usage_count >= v_coupon.usage_limit
  then
    return query select false, 'limit_reached'::text, v_coupon.id,
                        null::text, null::numeric, null::numeric, null::numeric;
    return;
  end if;

  -- Calcular descuento si nos pasaron el precio
  if p_service_price is not null then
    if v_coupon.discount_type = 'percent' then
      v_discount := round(p_service_price * v_coupon.discount_value / 100, 2);
    else
      v_discount := least(v_coupon.discount_value, p_service_price);
    end if;
    v_final := greatest(0, p_service_price - v_discount);
  end if;

  return query select true, null::text, v_coupon.id,
                      v_coupon.discount_type, v_coupon.discount_value,
                      v_discount, v_final;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: increment_coupon_usage (server-side, llamada desde appointment insert)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.increment_coupon_usage(
  p_coupon_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.coupons
  set usage_count = usage_count + 1,
      updated_at = now()
  where id = p_coupon_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.coupons enable row level security;

drop policy if exists "coupons_admin_select" on public.coupons;
create policy "coupons_admin_select"
  on public.coupons for select
  to authenticated
  using (public.current_user_has_barbershop_access(barbershop_slug));

drop policy if exists "coupons_admin_insert" on public.coupons;
create policy "coupons_admin_insert"
  on public.coupons for insert
  to authenticated
  with check (public.current_user_has_barbershop_access(barbershop_slug));

drop policy if exists "coupons_admin_update" on public.coupons;
create policy "coupons_admin_update"
  on public.coupons for update
  to authenticated
  using (public.current_user_has_barbershop_access(barbershop_slug))
  with check (public.current_user_has_barbershop_access(barbershop_slug));

drop policy if exists "coupons_admin_delete" on public.coupons;
create policy "coupons_admin_delete"
  on public.coupons for delete
  to authenticated
  using (public.current_user_has_barbershop_access(barbershop_slug));

grant select, insert, update, delete on public.coupons to authenticated;
grant execute on function public.validate_coupon_for_booking(text, text, numeric) to anon, authenticated;
revoke all on function public.increment_coupon_usage(uuid) from public;
