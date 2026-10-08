-- barbershop_products: el catálogo de productos de cada barbería (feature 035,
-- etapa A). La corre Bautista en el SQL Editor de Supabase.
--
-- Ceras, pomadas, polvos texturizadores: lo que la barbería vende en el
-- mostrador. En esta etapa el dueño solo los CARGA desde su panel; todavía no
-- se muestran en ningún lado público.
--
-- Sin stock por unidades, a propósito: `is_available` es un interruptor que el
-- dueño prende y apaga a mano. Un contador que nadie mantiene al día hace que
-- el catálogo mienta.
--
-- Hasta que esta migración se corra, la pantalla "Productos" del panel avisa
-- que el catálogo no está activado. Nada más cambia.

begin;

create table if not exists public.barbershop_products (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null references public.barbershops(slug) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  -- Pesos enteros, como los servicios.
  price integer not null check (price > 0 and price < 10000000),
  category text not null default 'otro' check (
    category in ('cera', 'pomada', 'polvo', 'barba', 'cuidado', 'otro')
  ),
  description text null check (description is null or char_length(description) <= 160),
  -- La foto es opcional. El path se guarda para poder borrarla del storage sin
  -- confiar en lo que mande el navegador.
  storage_path text null,
  public_url text null,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);

comment on table public.barbershop_products is
  'Catálogo de productos que la barbería ofrece (035). Borrado lógico con deleted_at.';

create index if not exists barbershop_products_por_barberia
  on public.barbershop_products (barbershop_slug, sort_order)
  where deleted_at is null;

alter table public.barbershop_products enable row level security;

-- Sin políticas a propósito: solo la toca el servidor con service_role, que
-- bypassea RLS. Los revoke hacen falta porque las tablas nuevas nacen con
-- permisos por defecto para anon y authenticated.
revoke all on public.barbershop_products from anon, authenticated;

-- Las fotos. Bucket público (las imágenes se ven en la página de la barbería)
-- con las mismas reglas que la galería. Lo escribe solo el servidor, así que
-- alcanza con la política de lectura.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barbershop-products',
  'barbershop-products',
  true,
  5 * 1024 * 1024, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "products_public_read" on storage.objects;
create policy "products_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'barbershop-products');

commit;

-- Verificación (tienen que dar 0 y 1, sin error):
-- select count(*) from public.barbershop_products;
-- select count(*) from storage.buckets where id = 'barbershop-products';
