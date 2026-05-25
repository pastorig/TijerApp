begin;

create table if not exists public.barbershops (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null unique,
  name text not null,
  description text,
  whatsapp text,
  instagram text,
  is_active boolean not null default true
);

create index if not exists barbershops_slug_idx
on public.barbershops (slug);

alter table public.barbershops enable row level security;

drop policy if exists "barbershops_public_select_active" on public.barbershops;
create policy "barbershops_public_select_active"
on public.barbershops
for select
to anon, authenticated
using (
  is_active = true
);

commit;
