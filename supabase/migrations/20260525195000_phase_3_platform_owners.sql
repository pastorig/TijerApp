begin;

create table if not exists public.platform_owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  role text not null default 'owner'
);

create index if not exists platform_owners_role_idx
on public.platform_owners (role);

alter table public.platform_owners enable row level security;

create or replace function public.current_user_is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_owners as owner_access
    where owner_access.user_id = auth.uid()
  );
$$;

revoke all on function public.current_user_is_platform_owner() from public;
grant execute on function public.current_user_is_platform_owner() to authenticated;

drop policy if exists "platform_owners_select_own_row" on public.platform_owners;
create policy "platform_owners_select_own_row"
on public.platform_owners
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists "appointments_admin_select_own_barbershop" on public.appointments;
create policy "appointments_admin_select_own_barbershop"
on public.appointments
for select
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "appointments_admin_update_own_barbershop" on public.appointments;
create policy "appointments_admin_update_own_barbershop"
on public.appointments
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

drop policy if exists "barbers_admin_manage_own_barbershop_select" on public.barbers;
create policy "barbers_admin_manage_own_barbershop_select"
on public.barbers
for select
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "barbers_admin_manage_own_barbershop_insert" on public.barbers;
create policy "barbers_admin_manage_own_barbershop_insert"
on public.barbers
for insert
to authenticated
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "barbers_admin_manage_own_barbershop_update" on public.barbers;
create policy "barbers_admin_manage_own_barbershop_update"
on public.barbers
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

drop policy if exists "barber_services_admin_manage_own_barbershop_select" on public.barber_services;
create policy "barber_services_admin_manage_own_barbershop_select"
on public.barber_services
for select
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "barber_services_admin_manage_own_barbershop_insert" on public.barber_services;
create policy "barber_services_admin_manage_own_barbershop_insert"
on public.barber_services
for insert
to authenticated
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
  or public.current_user_is_platform_owner()
);

drop policy if exists "barber_services_admin_manage_own_barbershop_update" on public.barber_services;
create policy "barber_services_admin_manage_own_barbershop_update"
on public.barber_services
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

drop policy if exists "barbershop_admins_select_own_rows" on public.barbershop_admins;
create policy "barbershop_admins_select_own_rows"
on public.barbershop_admins
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_platform_owner()
);

commit;
