begin;

-- ─────────────────────────────────────────────────────────────────────────
-- google_reviews_url en barbershops
-- URL configurable a la que se redirige al cliente si dejó 4 o 5 estrellas.
-- (Se agrega primero porque la RPC de contexto la referencia.)
-- ─────────────────────────────────────────────────────────────────────────

alter table public.barbershops
  add column if not exists google_reviews_url text null;

comment on column public.barbershops.google_reviews_url is
  'URL pública de reseñas en Google. Si está seteada, los clientes con rating >= 4 son invitados a dejar la reseña también en Google.';

-- ─────────────────────────────────────────────────────────────────────────
-- Reseñas post-turno
-- Reusa el confirmation_token del appointment para identificar al cliente
-- (no hay token separado). Una reseña por turno.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.appointment_reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique
    references public.appointments(id) on delete cascade,
  barbershop_slug text not null
    references public.barbershops(slug) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists appointment_reviews_barbershop_slug_idx
  on public.appointment_reviews (barbershop_slug, created_at desc);

alter table public.appointment_reviews enable row level security;

-- Admin de la barbería puede ver las reseñas de su barbería
drop policy if exists "appointment_reviews_admin_select_own"
  on public.appointment_reviews;
create policy "appointment_reviews_admin_select_own"
on public.appointment_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.barbershop_admins admins
    where admins.user_id = auth.uid()
      and admins.barbershop_slug = appointment_reviews.barbershop_slug
  )
);

-- Owner de plataforma ve todo
drop policy if exists "appointment_reviews_owner_select_all"
  on public.appointment_reviews;
create policy "appointment_reviews_owner_select_all"
on public.appointment_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_owners owners
    where owners.user_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────────────────
-- RPC pública: submit_appointment_review_by_token
-- Permite a un cliente dejar reseña pasando el confirmation_token del
-- turno. Solo si el turno está confirmed/pending y la fecha ya pasó (o es hoy).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.submit_appointment_review_by_token(
  p_token uuid,
  p_rating int,
  p_comment text
)
returns table (
  ok boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment_id uuid;
  v_barbershop_slug text;
  v_status text;
  v_date date;
  v_inserted_id uuid;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return query select false, 'invalid_rating'::text;
    return;
  end if;

  select
    appointment.id,
    appointment.barbershop_slug,
    appointment.status,
    appointment.appointment_date
  into
    v_appointment_id,
    v_barbershop_slug,
    v_status,
    v_date
  from public.appointments as appointment
  where appointment.confirmation_token = p_token
  limit 1;

  if v_appointment_id is null then
    return query select false, 'not_found'::text;
    return;
  end if;

  if v_status not in ('confirmed', 'pending') then
    return query select false, 'invalid_status'::text;
    return;
  end if;

  if v_date > current_date then
    return query select false, 'too_early'::text;
    return;
  end if;

  insert into public.appointment_reviews (
    appointment_id,
    barbershop_slug,
    rating,
    comment
  )
  values (
    v_appointment_id,
    v_barbershop_slug,
    p_rating,
    nullif(trim(coalesce(p_comment, '')), '')
  )
  on conflict (appointment_id) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    return query select false, 'already_submitted'::text;
  else
    return query select true, null::text;
  end if;
end;
$$;

revoke all on function public.submit_appointment_review_by_token(uuid, int, text)
  from public;
grant execute on function public.submit_appointment_review_by_token(uuid, int, text)
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- RPC pública: get_appointment_review_context_by_token
-- Devuelve datos mínimos para mostrar el formulario público de reseña
-- (nombre del cliente, barbería, fecha, si ya dejó reseña, google_reviews_url).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.get_appointment_review_context_by_token(
  p_token uuid
)
returns table (
  appointment_id uuid,
  barbershop_slug text,
  barbershop_name text,
  google_reviews_url text,
  customer_name text,
  service_name text,
  appointment_date text,
  appointment_time text,
  status text,
  already_submitted boolean,
  is_in_future boolean
)
language sql
security definer
set search_path = public
as $$
  select
    appointment.id as appointment_id,
    appointment.barbershop_slug,
    barbershop.name as barbershop_name,
    barbershop.google_reviews_url,
    appointment.customer_name,
    appointment.service_name,
    appointment.appointment_date::text,
    appointment.appointment_time::text,
    appointment.status,
    exists (
      select 1 from public.appointment_reviews r
      where r.appointment_id = appointment.id
    ) as already_submitted,
    (appointment.appointment_date > current_date) as is_in_future
  from public.appointments as appointment
  left join public.barbershops as barbershop
    on barbershop.slug = appointment.barbershop_slug
  where appointment.confirmation_token = p_token
  limit 1;
$$;

revoke all on function public.get_appointment_review_context_by_token(uuid) from public;
grant execute on function public.get_appointment_review_context_by_token(uuid)
  to anon, authenticated;

commit;
