-- ============================================================================
-- Appointments: campos de cupón aplicado (FASE C parte 2 — UI cliente)
-- ============================================================================
-- Cuando el cliente aplica un cupón al reservar, guardamos qué cupón usó y
-- cuánto descuento aplicó. Útil para reportes, refunds, y para incrementar
-- el usage_count del cupón vía trigger.
-- ============================================================================

alter table public.appointments
  add column if not exists coupon_id uuid null
    references public.coupons(id) on delete set null;

alter table public.appointments
  add column if not exists discount_amount numeric(10, 2) null
    check (discount_amount is null or discount_amount >= 0);

-- Index parcial para queries de "appointments con cupón aplicado"
create index if not exists appointments_coupon_idx
  on public.appointments (coupon_id)
  where coupon_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: incrementar usage_count del cupón cuando se crea un appointment
-- con coupon_id no-null
-- ─────────────────────────────────────────────────────────────────────────────
-- Garantiza consistencia: no podés tener un appointment con cupón y que el
-- cupón siga con usage_count viejo. Se hace en SECURITY DEFINER porque el
-- INSERT del appointment es público (anon) y no tiene permiso de update
-- en coupons directamente.

create or replace function public.tr_increment_coupon_usage_on_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if NEW.coupon_id is not null then
    update public.coupons
    set usage_count = usage_count + 1,
        updated_at = now()
    where id = NEW.coupon_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists appointment_increment_coupon_usage_trg on public.appointments;
create trigger appointment_increment_coupon_usage_trg
after insert on public.appointments
for each row
execute function public.tr_increment_coupon_usage_on_appointment();
