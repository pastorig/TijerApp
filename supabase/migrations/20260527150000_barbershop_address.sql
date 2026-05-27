-- Agrega dirección opcional a la barbería.
-- Se muestra en la landing pública (sección Información) si está cargada;
-- si NULL/'', esa sección no aparece. Opcional al crear/editar.

alter table public.barbershops
  add column if not exists address text null;

comment on column public.barbershops.address is
  'Dirección física de la barbería. Opcional. Se muestra en la landing pública si está cargada.';
