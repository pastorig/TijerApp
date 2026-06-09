-- ============================================================================
-- FIX: re-otorgar EXECUTE a anon en get_public_appointment_by_token
-- ============================================================================
-- BUG: en migrations anteriores hicimos DROP FUNCTION + CREATE OR REPLACE
-- para arreglar type mismatches. Eso RESETÉ los grants → la función ya
-- no era invocable por el cliente anon (público sin login).
--
-- Consecuencia: /r/[token] llamaba al RPC, recibía null por permission
-- denied (silencioso en RPC tipo TABLE), y disparaba notFound() → 404.
--
-- FIX: re-grant EXECUTE a anon Y authenticated (este endpoint es público,
-- el cliente que abre su /r/[token] no está logueado).
-- ============================================================================

grant execute on function public.get_public_appointment_by_token(text) to anon, authenticated;
