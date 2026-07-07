-- ============================================================================
-- Anticipación mínima para reservar (min_booking_notice_minutes)
-- ============================================================================
-- Minutos de antelación con los que un cliente puede reservar un turno.
-- Ej: 60 → a las 15:20 no se puede tomar el de las 16:00 (faltan 40 min);
-- el más cercano pasa a ser el siguiente slot según el intervalo del barbero.
-- 0 (default) = sin restricción, comportamiento actual.
-- ============================================================================

alter table public.barbershops
  add column if not exists min_booking_notice_minutes int not null default 0
    check (min_booking_notice_minutes >= 0 and min_booking_notice_minutes <= 10080);
