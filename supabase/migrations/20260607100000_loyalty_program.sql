-- ============================================================================
-- Loyalty Program — TijerApp (FASE B feature Pro)
-- ============================================================================
-- Sistema de fidelización: "X visitas = premio Y" por barbería.
-- Stamps automáticos cuando appointment confirmado pasa su fecha.
-- ============================================================================

create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null unique
    references public.barbershops(slug) on delete cascade,
  is_active boolean not null default true,
  visits_required int not null default 10
    check (visits_required > 0 and visits_required <= 100),
  reward_name text not null default 'Corte gratis',
  reward_description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_stamps (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null
    references public.barbershops(slug) on delete cascade,
  customer_phone text not null,
  appointment_id uuid null
    references public.appointments(id) on delete set null,
  earned_at timestamptz not null default now(),
  redeemed_at timestamptz null,
  redemption_note text null,
  constraint loyalty_stamps_appointment_unique unique (appointment_id)
);

create index if not exists loyalty_stamps_customer_active_idx
  on public.loyalty_stamps (barbershop_slug, customer_phone)
  where redeemed_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: grant_loyalty_stamp_for_appointment
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.grant_loyalty_stamp_for_appointment(
  p_appointment_id uuid
) returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appointment record;
  v_program_active boolean;
begin
  select id, barbershop_slug, customer_phone, status, appointment_date
  into v_appointment
  from public.appointments
  where id = p_appointment_id;

  if not found then return 0; end if;
  if v_appointment.status <> 'confirmed' then return 0; end if;
  if v_appointment.appointment_date >= current_date then return 0; end if;
  if v_appointment.customer_phone is null or v_appointment.customer_phone = '' then
    return 0;
  end if;

  select is_active into v_program_active
  from public.loyalty_programs
  where barbershop_slug = v_appointment.barbershop_slug;

  if not found or not v_program_active then return 0; end if;

  insert into public.loyalty_stamps
    (barbershop_slug, customer_phone, appointment_id)
  values
    (v_appointment.barbershop_slug, v_appointment.customer_phone, v_appointment.id)
  on conflict (appointment_id) do nothing;

  return 1;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: batch_grant_loyalty_stamps
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.batch_grant_loyalty_stamps()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int := 0;
  v_appointment record;
begin
  for v_appointment in
    select a.id
      from public.appointments a
      join public.loyalty_programs lp on lp.barbershop_slug = a.barbershop_slug
      where a.status = 'confirmed'
        and a.appointment_date < current_date
        and a.customer_phone is not null
        and a.customer_phone <> ''
        and lp.is_active = true
        and not exists (
          select 1 from public.loyalty_stamps ls
          where ls.appointment_id = a.id
        )
  loop
    perform public.grant_loyalty_stamp_for_appointment(v_appointment.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.tr_appointment_grant_stamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if NEW.status = 'confirmed'
     and NEW.appointment_date < current_date
     and (TG_OP = 'INSERT' or OLD.status <> 'confirmed' or OLD.appointment_date <> NEW.appointment_date)
  then
    perform public.grant_loyalty_stamp_for_appointment(NEW.id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists appointment_grant_stamp_trg on public.appointments;
create trigger appointment_grant_stamp_trg
after insert or update on public.appointments
for each row
execute function public.tr_appointment_grant_stamp();

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC PÚBLICA: para mostrar al cliente sus stamps en /r/[token]
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_public_loyalty_status_by_token(
  p_token text
) returns table (
  visits_required int,
  reward_name text,
  reward_description text,
  active_stamps int,
  is_program_active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text;
  v_slug text;
begin
  select customer_phone, barbershop_slug
  into v_phone, v_slug
  from public.appointments
  where confirmation_token = p_token
  limit 1;

  if v_phone is null then return; end if;

  return query
  select
    lp.visits_required,
    lp.reward_name,
    lp.reward_description,
    coalesce((
      select count(*)::int
      from public.loyalty_stamps ls
      where ls.barbershop_slug = v_slug
        and ls.customer_phone = v_phone
        and ls.redeemed_at is null
    ), 0) as active_stamps,
    lp.is_active
  from public.loyalty_programs lp
  where lp.barbershop_slug = v_slug;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.loyalty_programs enable row level security;
alter table public.loyalty_stamps enable row level security;

drop policy if exists "loyalty_programs_admin_select" on public.loyalty_programs;
create policy "loyalty_programs_admin_select"
  on public.loyalty_programs for select
  to authenticated
  using (public.current_user_has_barbershop_access(barbershop_slug));

drop policy if exists "loyalty_programs_admin_insert" on public.loyalty_programs;
create policy "loyalty_programs_admin_insert"
  on public.loyalty_programs for insert
  to authenticated
  with check (public.current_user_has_barbershop_access(barbershop_slug));

drop policy if exists "loyalty_programs_admin_update" on public.loyalty_programs;
create policy "loyalty_programs_admin_update"
  on public.loyalty_programs for update
  to authenticated
  using (public.current_user_has_barbershop_access(barbershop_slug))
  with check (public.current_user_has_barbershop_access(barbershop_slug));

drop policy if exists "loyalty_stamps_admin_select" on public.loyalty_stamps;
create policy "loyalty_stamps_admin_select"
  on public.loyalty_stamps for select
  to authenticated
  using (public.current_user_has_barbershop_access(barbershop_slug));

drop policy if exists "loyalty_stamps_admin_update" on public.loyalty_stamps;
create policy "loyalty_stamps_admin_update"
  on public.loyalty_stamps for update
  to authenticated
  using (public.current_user_has_barbershop_access(barbershop_slug))
  with check (public.current_user_has_barbershop_access(barbershop_slug));

grant select, insert, update on public.loyalty_programs to authenticated;
grant select, update on public.loyalty_stamps to authenticated;
grant execute on function public.get_public_loyalty_status_by_token(text) to anon, authenticated;

revoke all on function public.grant_loyalty_stamp_for_appointment(uuid) from public;
revoke all on function public.batch_grant_loyalty_stamps() from public;
