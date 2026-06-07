-- ============================================================================
-- Multi-Admin — TijerApp (FASE E feature Pro)
-- ============================================================================
-- Permite que una barbería tenga hasta N admins (controlado en API, no DB).
-- Agrega is_owner para distinguir al fundador (los originales pasan a true).
-- El owner puede invitar/remover otros admins; un admin no-owner no puede.
-- ============================================================================

-- Agregar is_owner: por default false. Después marcamos los más viejos.
alter table public.barbershop_admins
  add column if not exists is_owner boolean not null default false;

alter table public.barbershop_admins
  add column if not exists invited_by uuid null;

alter table public.barbershop_admins
  add column if not exists created_at timestamptz not null default now();

-- Migrar: el admin más viejo de cada barbería pasa a ser owner.
-- (Si hay más de uno con el mismo created_at, los marca a todos como owner —
-- caso de seed inicial donde varios se crean al mismo tiempo.)
update public.barbershop_admins ba
set is_owner = true
where (ba.barbershop_slug, ba.created_at) in (
  select barbershop_slug, min(created_at)
  from public.barbershop_admins
  group by barbershop_slug
);

-- Index para queries de lista admins por barbería
create index if not exists barbershop_admins_barbershop_idx
  on public.barbershop_admins (barbershop_slug);
