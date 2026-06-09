-- ============================================================================
-- FIX: eliminar overload duplicado de get_public_appointment_by_token
-- ============================================================================
-- ERROR EN PROD (PGRST203):
-- 'Could not choose the best candidate function between:
--   public.get_public_appointment_by_token(p_token => text),
--   public.get_public_appointment_by_token(p_token => uuid)'
--
-- CAUSA: en la migration original del RPC, p_token estaba declarado como
-- UUID. Después yo recreé el RPC con p_token TEXT (para hacer cast manual).
-- 'DROP FUNCTION ... (text)' eliminó la nueva pero no la vieja → quedaron
-- 2 funciones con el mismo nombre y PostgREST no puede elegir.
--
-- FIX: drop EXPLÍCITO de la versión (uuid) y re-grant a anon en la (text)
-- que es la que queremos mantener.
-- ============================================================================

drop function if exists public.get_public_appointment_by_token(uuid);

-- Re-grant por las dudas (debería estar ya, pero idempotente)
grant execute on function public.get_public_appointment_by_token(text) to anon, authenticated;
