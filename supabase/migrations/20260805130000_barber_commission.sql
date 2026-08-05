-- ─────────────────────────────────────────────────────────────────────────────
-- Comisión por barbero (feature 014)
--
-- En la mayoría de las barberías el barbero cobra un porcentaje de lo que
-- produce. El panel ya sabe cuánto produjo cada uno; le faltaba el porcentaje.
--
-- `NULL` significa **sin configurar**, y es distinto de 0%. Si un barbero sin
-- configurar se mostrara como 0%, el dueño vería "$0" y creería que no le debe
-- nada, cuando en realidad nunca cargó el dato. Por eso la columna es nullable
-- y arranca en NULL para todos: es exactamente el estado real de hoy.
--
-- `numeric(5,2)` admite medios puntos (ej. 47.5), que aparecen en arreglos
-- reales. El check acepta NULL o un valor entre 0 y 100.
--
-- Migración ADITIVA: no toca ni una fila existente.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.barbers
  add column if not exists commission_percent numeric(5,2);

alter table public.barbers
  drop constraint if exists barbers_commission_percent_range;

alter table public.barbers
  add constraint barbers_commission_percent_range
  check (
    commission_percent is null
    or (commission_percent >= 0 and commission_percent <= 100)
  );

commit;
