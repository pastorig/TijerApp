-- BarberSync - Fase 1 RLS
-- Aplicar manualmente en Supabase SQL Editor.
-- Objetivo:
-- 1. Reserva publica sin exponer appointments completos.
-- 2. Admins autenticados limitados a barberias presentes en barbershop_admins.
-- 3. Sin permisos de escritura publica fuera de crear reservas.

begin;

-- Helper para reutilizar acceso por barberia en policies.
create or replace function public.current_user_has_barbershop_access(
  target_barbershop_slug text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.barbershop_admins as admin_access
    where admin_access.user_id = auth.uid()
      and admin_access.barbershop_slug = target_barbershop_slug
  );
$$;

revoke all on function public.current_user_has_barbershop_access(text) from public;
grant execute on function public.current_user_has_barbershop_access(text) to authenticated;

-- Helper publico para disponibilidad sin abrir SELECT sobre appointments.
create or replace function public.get_public_occupied_appointment_times(
  p_barbershop_slug text,
  p_barber_id text,
  p_appointment_date text
)
returns table (appointment_time text)
language sql
stable
security definer
set search_path = public
as $$
  select appointment.appointment_time
  from public.appointments as appointment
  where appointment.barbershop_slug = p_barbershop_slug
    and appointment.barber_id = p_barber_id
    and appointment.appointment_date = p_appointment_date::date
    and appointment.status in ('pending', 'confirmed');
$$;

revoke all on function public.get_public_occupied_appointment_times(text, text, text) from public;
grant execute on function public.get_public_occupied_appointment_times(text, text, text) to anon, authenticated;

alter table public.appointments enable row level security;
alter table public.barbers enable row level security;
alter table public.barber_services enable row level security;
alter table public.barbershop_admins enable row level security;

drop policy if exists "appointments_public_insert_pending" on public.appointments;
create policy "appointments_public_insert_pending"
on public.appointments
for insert
to anon, authenticated
with check (
  status = 'pending'
  and exists (
    select 1
    from public.barbers as barber
    where barber.id::text = appointments.barber_id
      and barber.barbershop_slug = appointments.barbershop_slug
      and barber.is_active = true
      and barber.deleted_at is null
  )
);

drop policy if exists "appointments_admin_select_own_barbershop" on public.appointments;
create policy "appointments_admin_select_own_barbershop"
on public.appointments
for select
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
);

drop policy if exists "appointments_admin_update_own_barbershop" on public.appointments;
create policy "appointments_admin_update_own_barbershop"
on public.appointments
for update
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
)
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
);

drop policy if exists "barbers_public_select_active" on public.barbers;
create policy "barbers_public_select_active"
on public.barbers
for select
to anon, authenticated
using (
  is_active = true
  and deleted_at is null
);

drop policy if exists "barbers_admin_manage_own_barbershop_select" on public.barbers;
create policy "barbers_admin_manage_own_barbershop_select"
on public.barbers
for select
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
);

drop policy if exists "barbers_admin_manage_own_barbershop_insert" on public.barbers;
create policy "barbers_admin_manage_own_barbershop_insert"
on public.barbers
for insert
to authenticated
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
);

drop policy if exists "barbers_admin_manage_own_barbershop_update" on public.barbers;
create policy "barbers_admin_manage_own_barbershop_update"
on public.barbers
for update
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
)
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
);

drop policy if exists "barber_services_public_select_active" on public.barber_services;
create policy "barber_services_public_select_active"
on public.barber_services
for select
to anon, authenticated
using (
  is_active = true
  and deleted_at is null
);

drop policy if exists "barber_services_admin_manage_own_barbershop_select" on public.barber_services;
create policy "barber_services_admin_manage_own_barbershop_select"
on public.barber_services
for select
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
);

drop policy if exists "barber_services_admin_manage_own_barbershop_insert" on public.barber_services;
create policy "barber_services_admin_manage_own_barbershop_insert"
on public.barber_services
for insert
to authenticated
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
);

drop policy if exists "barber_services_admin_manage_own_barbershop_update" on public.barber_services;
create policy "barber_services_admin_manage_own_barbershop_update"
on public.barber_services
for update
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
)
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
);

drop policy if exists "barbershop_admins_select_own_rows" on public.barbershop_admins;
create policy "barbershop_admins_select_own_rows"
on public.barbershop_admins
for select
to authenticated
using (
  user_id = auth.uid()
);

commit;
