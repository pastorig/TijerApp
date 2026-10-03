-- ============================================================================
-- Borrar dos funciones que nadie llama
-- ============================================================================
-- Barrido del 2/10/2026 buscando funciones creadas y nunca invocadas (ya pasó
-- dos veces que una feature "existía" y no corría). No apareció ninguna feature
-- muerta, pero sí dos funciones huérfanas que conviene sacar:
--
-- 1) increment_coupon_usage(uuid): la reemplazó el trigger
--    appointment_increment_coupon_usage_trg (20260607150000), que hace el
--    mismo +1. Seguía EJECUTABLE POR ANÓNIMOS (el revoke de "public" no saca
--    el grant que Supabase le da a anon): con el id de un cupón, cualquiera
--    podía sumarle usos hasta agotarlo. Probado: la RPC respondía 204 con la
--    clave pública.
--
-- 2) get_public_occupied_appointment_times(text, text, text): la reemplazó
--    get_public_barber_day_appointments, que devuelve hora Y duración. Ningún
--    código la llama.
-- ============================================================================

begin;

drop function if exists public.increment_coupon_usage(uuid);
drop function if exists public.get_public_occupied_appointment_times(text, text, text);

commit;
