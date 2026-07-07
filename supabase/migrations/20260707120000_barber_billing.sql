-- 007-cobro-barberos — Fase 1: cobro de barberos (transferencia + activación manual)
-- Aditivo. No toca datos existentes.
--
-- Reutilizamos la columna EXISTENTE `barbershop_subscriptions.current_period_ends_at`
-- como "pagado hasta" (ya existe en el schema; la usan owner/plans). No se agrega
-- columna nueva. Solo sumamos el historial de pagos + una RPC atómica.

-- 1) Historial de pagos (append-only, auditoría). Owner-only.
create table if not exists public.barbershop_payments (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null,
  amount numeric(12,2) not null check (amount >= 0),
  method text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  note text null,
  registered_by text null,
  created_at timestamptz not null default now()
);

create index if not exists barbershop_payments_slug_idx
  on public.barbershop_payments (barbershop_slug, created_at desc);

-- RLS on, sin políticas públicas: solo service_role (endpoint owner-auth) accede.
alter table public.barbershop_payments enable row level security;

-- 2) RPC atómica: inserta el pago + extiende el período pago + activa la suscripción.
--    Limpia las fechas de trial (invariante: una barbería paga no muestra countdown de trial).
create or replace function public.register_barbershop_payment(
  p_slug text,
  p_amount numeric,
  p_method text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_note text,
  p_registered_by text
) returns public.barbershop_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.barbershop_payments;
begin
  insert into public.barbershop_payments (
    barbershop_slug, amount, method, period_start, period_end, note, registered_by
  ) values (
    p_slug, p_amount, p_method, p_period_start, p_period_end, p_note, p_registered_by
  )
  returning * into v_payment;

  update public.barbershop_subscriptions
     set current_period_started_at = p_period_start,
         current_period_ends_at   = p_period_end,
         status                   = 'active',
         trial_expires_at         = null,
         grace_expires_at         = null,
         updated_at               = now()
   where barbershop_slug = p_slug;

  return v_payment;
end;
$$;

-- Solo el service_role puede ejecutar la RPC (los barberos no).
revoke all on function public.register_barbershop_payment(
  text, numeric, text, timestamptz, timestamptz, text, text
) from public, anon, authenticated;
