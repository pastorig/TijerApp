-- ============================================================================
-- MercadoPago — sistema de seña por barbería (B1)
-- ============================================================================
-- Cada barbería puede activar el cobro de seña al reservar. Si está activa,
-- el cliente debe pagar la seña en X horas o el turno se cancela auto.
-- Si está inactiva, el flow de reserva es idéntico al actual (solo WA).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- barbershops: configuración MP por barbería
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.barbershops
  add column if not exists mp_enabled boolean not null default false;

alter table public.barbershops
  add column if not exists mp_access_token text null;

alter table public.barbershops
  add column if not exists mp_public_key text null;

alter table public.barbershops
  add column if not exists mp_user_id text null;

-- Porcentaje del precio del servicio que se cobra como seña (1-100)
alter table public.barbershops
  add column if not exists deposit_percent int not null default 30
    check (deposit_percent >= 1 and deposit_percent <= 100);

-- Monto mínimo de seña en ARS. Si el porcentaje del precio queda por debajo
-- del mínimo, se cobra el mínimo. Null = sin mínimo.
alter table public.barbershops
  add column if not exists deposit_min_amount int null
    check (deposit_min_amount is null or deposit_min_amount > 0);

-- Horas tras la reserva en las que el cliente debe pagar o se cancela auto.
alter table public.barbershops
  add column if not exists deposit_auto_cancel_hours int not null default 24
    check (deposit_auto_cancel_hours >= 1 and deposit_auto_cancel_hours <= 168);

-- ─────────────────────────────────────────────────────────────────────────────
-- appointments: estado del pago de la seña
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.appointments
  add column if not exists deposit_required boolean not null default false;

-- Monto cobrado de seña (en ARS, calculado al crear el appointment)
alter table public.appointments
  add column if not exists deposit_amount int null
    check (deposit_amount is null or deposit_amount >= 0);

-- Estado del pago de la seña:
--   null         → no aplica (mp_enabled=false en la barbería)
--   'pending'    → preference creada, esperando pago
--   'paid'       → cliente pagó, turno confirmado
--   'expired'    → no pagó dentro del plazo, turno cancelado auto
--   'refunded'   → barbero devolvió la seña (cancelación manual)
--   'failed'     → pago rechazado por MP
alter table public.appointments
  add column if not exists deposit_status text null
    check (deposit_status is null or deposit_status in
      ('pending', 'paid', 'expired', 'refunded', 'failed'));

alter table public.appointments
  add column if not exists deposit_paid_at timestamptz null;

-- Cuándo expira el plazo de pago. Si null, no se auto-cancela.
alter table public.appointments
  add column if not exists deposit_expires_at timestamptz null;

-- IDs de Mercado Pago para tracking
alter table public.appointments
  add column if not exists mp_payment_id text null;

alter table public.appointments
  add column if not exists mp_preference_id text null;

-- Index para que el cron de auto-cancelación encuentre rápido los pendientes
create index if not exists appointments_deposit_pending_idx
  on public.appointments (deposit_expires_at)
  where deposit_status = 'pending';

-- Index para webhook lookup por preference_id
create index if not exists appointments_mp_preference_idx
  on public.appointments (mp_preference_id)
  where mp_preference_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- payment_events: audit log de eventos MP (webhooks + acciones manuales)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid null
    references public.appointments(id) on delete cascade,
  -- Tipos de evento:
  --   'preference_created' → creamos preference en MP
  --   'webhook_received'   → llegó notificación de MP
  --   'payment_approved'   → MP confirmó pago
  --   'payment_rejected'   → MP rechazó pago
  --   'payment_pending'    → pago en proceso
  --   'manual_refund'      → barbero devolvió manual
  --   'auto_expired'       → cron canceló por timeout
  event_type text not null,
  amount int null,
  mp_payment_id text null,
  mp_preference_id text null,
  raw_payload jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_appointment_idx
  on public.payment_events (appointment_id);

create index if not exists payment_events_created_idx
  on public.payment_events (created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS para payment_events: admin lee solo eventos de su barbería
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.payment_events enable row level security;

drop policy if exists "payment_events_admin_select" on public.payment_events;
create policy "payment_events_admin_select"
  on public.payment_events for select
  to authenticated
  using (
    exists (
      select 1 from public.appointments a
      where a.id = payment_events.appointment_id
        and public.current_user_has_barbershop_access(a.barbershop_slug)
    )
  );

-- Inserts solo via service_role (webhook o cron), nunca desde cliente
grant select on public.payment_events to authenticated;
