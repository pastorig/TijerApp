begin;

alter table public.barbershops
  add column if not exists working_hours_start text not null default '16:00',
  add column if not exists working_hours_end text not null default '21:00',
  add column if not exists slot_interval_minutes integer not null default 30;

alter table public.barbershops
  drop constraint if exists barbershops_slot_interval_minutes_positive;

alter table public.barbershops
  add constraint barbershops_slot_interval_minutes_positive
  check (slot_interval_minutes > 0);

drop policy if exists "barbershops_admin_update_own_barbershop" on public.barbershops;
create policy "barbershops_admin_update_own_barbershop"
on public.barbershops
for update
to authenticated
using (
  public.current_user_has_barbershop_access(slug)
  or public.current_user_is_platform_owner()
)
with check (
  public.current_user_has_barbershop_access(slug)
  or public.current_user_is_platform_owner()
);

commit;
