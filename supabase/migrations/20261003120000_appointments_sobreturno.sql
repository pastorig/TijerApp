-- Contrato de la migración de 031 (el archivo real va en supabase/migrations/ con timestamp).
-- La corre Bautista en el SQL Editor de Supabase.

begin;

alter table public.appointments
  add column if not exists is_sobreturno boolean not null default false;

comment on column public.appointments.is_sobreturno is
  'Turno metido a propósito en un hueco o encima de otro desde el panel. Se dibuja distinto en la agenda y no cuenta para el índice de horario único.';

drop index if exists public.appointments_unique_active_slot;
create unique index appointments_unique_active_slot
  on public.appointments (barbershop_slug, barber_id, appointment_date, appointment_time)
  where status in ('pending', 'confirmed') and not is_sobreturno;

commit;
