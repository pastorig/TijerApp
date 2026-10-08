-- appointment_products: los productos que un cliente sumó a su turno al
-- reservar (feature 035, etapa C). La corre Bautista en el SQL Editor.
--
-- Un renglón por producto pedido. Guarda una COPIA del nombre y del precio del
-- momento: si después el dueño edita o borra el producto, el turno sigue
-- diciendo lo que el cliente pidió y a qué precio. Mismo criterio que
-- `service_name` y `service_price` en `appointments`.
--
-- Hasta que esta migración se corra, la reserva funciona exactamente como hoy:
-- el paso "¿Te llevás algo?" aparece, pero los productos no se pueden guardar y
-- el cliente recibe el aviso de que no se sumaron. El turno se reserva igual.

begin;

create table if not exists public.appointment_products (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  barbershop_slug text not null references public.barbershops(slug) on delete cascade,
  -- Si el producto se borra de verdad, el renglón queda con su copia.
  product_id uuid null references public.barbershop_products(id) on delete set null,
  product_name text not null,
  unit_price integer not null check (unit_price > 0),
  quantity integer not null check (quantity between 1 and 5),
  created_at timestamptz not null default now()
);

comment on table public.appointment_products is
  'Productos del catálogo sumados a un turno al reservar (035). Nombre y precio son copia del momento.';

create index if not exists appointment_products_por_turno
  on public.appointment_products (appointment_id);

-- Para "Productos vendidos" en reportes (etapa D) y para traer los de toda la
-- barbería de una en el turnero.
create index if not exists appointment_products_por_barberia
  on public.appointment_products (barbershop_slug, created_at desc);

alter table public.appointment_products enable row level security;

-- Las tablas nuevas nacen con permisos por defecto para anon y authenticated.
revoke all on public.appointment_products from anon, authenticated;

-- El turnero del dueño lee los turnos desde el navegador (con su sesión), y
-- los productos van por el mismo camino: SOLO LECTURA y solo de su barbería.
-- Escribir, únicamente el servidor al reservar.
grant select on public.appointment_products to authenticated;

drop policy if exists "appointment_products_admin_select_own_barbershop" on public.appointment_products;
create policy "appointment_products_admin_select_own_barbershop"
on public.appointment_products
for select
to authenticated
using (
  public.current_user_has_barbershop_access(barbershop_slug)
);

commit;

-- Verificación (tiene que dar 0, sin error):
-- select count(*) from public.appointment_products;
