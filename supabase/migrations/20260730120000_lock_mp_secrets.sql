-- ─────────────────────────────────────────────────────────────────────────────
-- SEGURIDAD: dejar de exponer los secretos de MercadoPago a los clientes
--
-- ─── EL PROBLEMA ─────────────────────────────────────────────────────────────
-- La policy `barbershops_public_select_active` permite `select` sobre
-- `public.barbershops` a `anon` y `authenticated` para toda barbería activa.
-- RLS es row-level: filtra FILAS, no COLUMNAS. Así que cualquiera con la anon
-- key —que es pública por diseño, viaja en el bundle del browser— podía leer la
-- fila entera, incluido `mp_access_token`.
--
-- Verificado en producción (2026-07-30): un cliente anónimo leyó el token real
-- de cobros de una barbería (`APP_USR-…`). Con ese token un tercero puede
-- operar la cuenta de MercadoPago del barbero.
--
-- Peor todavía: como la policy también aplica a `authenticated`, el admin de
-- CUALQUIER barbería podía leer los tokens de TODAS las demás.
--
-- ─── LA SOLUCIÓN ─────────────────────────────────────────────────────────────
-- Postgres sí sabe restringir por columna: se revoca el `select` sobre la tabla
-- y se vuelve a otorgar solo sobre las columnas públicas. La policy RLS sigue
-- decidiendo QUÉ FILAS se ven; el grant decide QUÉ COLUMNAS.
--
-- `service_role` no se toca: bypassea RLS y grants, y es el único que necesita
-- los secretos (`/api/appointments/book` para crear la preferencia y
-- `/api/admin/mp` para la config). Ya se verificó que ningún otro camino los usa.
--
-- `mp_public_key` SÍ queda pública: es la clave del checkout, pensada para el
-- browser.
--
-- ─── DESPUÉS DE CORRER ESTO ──────────────────────────────────────────────────
-- Cualquier `select` de esas columnas con la anon key falla con "permission
-- denied for column". El código ya no las pide (ver `barbershopSelectFields` en
-- `src/lib/barbershops.ts`), así que no debería romperse nada.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- 1) Sacar el select amplio sobre la tabla.
revoke select on public.barbershops from anon, authenticated;

-- 2) Devolverlo solo sobre las columnas que son públicas de verdad.
grant select (
  id,
  created_at,
  slug,
  name,
  description,
  whatsapp,
  instagram,
  address,
  logo_url,
  google_reviews_url,
  working_hours_start,
  working_hours_end,
  slot_interval_minutes,
  is_active,
  auto_confirm_appointments,
  waitlist_enabled,
  require_client_email,
  min_booking_notice_minutes,
  whatsapp_message_template,
  mp_enabled,
  mp_public_key,
  deposit_percent,
  deposit_min_amount,
  deposit_auto_cancel_hours
) on public.barbershops to anon, authenticated;

-- 3) El update del panel (policy `barbershops_admin_update_own_barbershop`)
--    tampoco tiene por qué tocar los secretos desde el browser: la config de
--    MercadoPago se guarda por `/api/admin/mp`, que usa service_role.
revoke update on public.barbershops from anon, authenticated;

grant update (
  name,
  description,
  whatsapp,
  instagram,
  address,
  logo_url,
  google_reviews_url,
  working_hours_start,
  working_hours_end,
  slot_interval_minutes,
  is_active,
  auto_confirm_appointments,
  waitlist_enabled,
  require_client_email,
  min_booking_notice_minutes,
  whatsapp_message_template
) on public.barbershops to authenticated;

commit;

-- ─── VERIFICACIÓN (correr aparte, después del commit) ────────────────────────
-- Debe devolver 0 filas: ninguna columna secreta otorgada a anon/authenticated.
--
-- select grantee, table_name, column_name, privilege_type
-- from information_schema.column_privileges
-- where table_schema = 'public'
--   and table_name = 'barbershops'
--   and grantee in ('anon', 'authenticated')
--   and column_name in ('mp_access_token','mp_refresh_token','mp_user_id','mp_token_expires_at');
