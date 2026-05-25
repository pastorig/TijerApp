begin;

create table if not exists public.barber_weekly_schedules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  barbershop_slug text not null,
  barber_id uuid not null references public.barbers (id) on delete cascade,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  is_working boolean not null default true,
  constraint barber_weekly_schedules_day_of_week_check
    check (day_of_week between 0 and 6),
  constraint barber_weekly_schedules_time_range_check
    check (start_time < end_time),
  constraint barber_weekly_schedules_barber_day_unique
    unique (barber_id, day_of_week)
);

create table if not exists public.barber_time_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  barbershop_slug text not null,
  barber_id uuid not null references public.barbers (id) on delete cascade,
  block_date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  is_active boolean not null default true,
  deleted_at timestamptz,
  constraint barber_time_blocks_time_range_check
    check (start_time < end_time)
);

create index if not exists barber_weekly_schedules_barbershop_idx
on public.barber_weekly_schedules (barbershop_slug, barber_id, day_of_week);

create index if not exists barber_time_blocks_barber_date_idx
on public.barber_time_blocks (barbershop_slug, barber_id, block_date)
where is_active = true and deleted_at is null;

alter table public.barber_weekly_schedules enable row level security;
alter table public.barber_time_blocks enable row level security;

drop policy if exists "barber_weekly_schedules_public_select" on public.barber_weekly_schedules;
create policy "barber_weekly_schedules_public_select"
on public.barber_weekly_schedules
for select
to anon, authenticated
using (true);

drop policy if exists "barber_weekly_schedules_admin_manage_own_barbershop_select" on public.barber_weekly_schedules;
create policy "barber_weekly_schedules_admin_manage_own_barbershop_select"
on public.barber_weekly_schedules
for select
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "barber_weekly_schedules_admin_manage_own_barbershop_insert" on public.barber_weekly_schedules;
create policy "barber_weekly_schedules_admin_manage_own_barbershop_insert"
on public.barber_weekly_schedules
for insert
to authenticated
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "barber_weekly_schedules_admin_manage_own_barbershop_update" on public.barber_weekly_schedules;
create policy "barber_weekly_schedules_admin_manage_own_barbershop_update"
on public.barber_weekly_schedules
for update
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
)
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "barber_time_blocks_public_select_active" on public.barber_time_blocks;
create policy "barber_time_blocks_public_select_active"
on public.barber_time_blocks
for select
to anon, authenticated
using (
  is_active = true
  and deleted_at is null
);

drop policy if exists "barber_time_blocks_admin_manage_own_barbershop_select" on public.barber_time_blocks;
create policy "barber_time_blocks_admin_manage_own_barbershop_select"
on public.barber_time_blocks
for select
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "barber_time_blocks_admin_manage_own_barbershop_insert" on public.barber_time_blocks;
create policy "barber_time_blocks_admin_manage_own_barbershop_insert"
on public.barber_time_blocks
for insert
to authenticated
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "barber_time_blocks_admin_manage_own_barbershop_update" on public.barber_time_blocks;
create policy "barber_time_blocks_admin_manage_own_barbershop_update"
on public.barber_time_blocks
for update
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
)
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

create or replace function public.get_public_barber_day_appointments(
  p_barbershop_slug text,
  p_barber_id text,
  p_appointment_date text
)
returns table (
  appointment_time text,
  service_duration_minutes integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    appointment.appointment_time,
    appointment.service_duration_minutes
  from public.appointments as appointment
  where appointment.barbershop_slug = p_barbershop_slug
    and appointment.barber_id = p_barber_id
    and appointment.appointment_date = p_appointment_date::date
    and appointment.status in ('pending', 'confirmed');
$$;

revoke all on function public.get_public_barber_day_appointments(text, text, text) from public;
grant execute on function public.get_public_barber_day_appointments(text, text, text) to anon, authenticated;

commit;
