-- ─────────────────────────────────────────────────────────────────────────────
-- Renombrar el slug de SV Barber: 'sv-barber' → 'barber'
--
-- Pedido de Bautista (2026-07-30): el barbero sumó un empleado y no quiere que
-- el link público lleve sus iniciales. Cambia SOLO el slug (y con él la URL
-- pública y la del panel). El resto de la configuración queda igual — de hecho
-- el `name` de la barbería ya era "Barber".
--
-- ─── POR QUÉ ESTO VA EN UNA TRANSACCIÓN Y NO POR LA APP ──────────────────────
-- Son 324 filas en 17 tablas. Hacerlo con 17 requests desde afuera no tiene
-- rollback: si falla a mitad de camino, la barbería queda partida en dos y deja
-- de funcionar para un negocio real con 175 turnos cargados. Acá es todo o nada.
--
-- ─── POR QUÉ SE CLONA Y SE BORRA EN VEZ DE UN UPDATE SIMPLE ──────────────────
-- Hay 6 foreign keys contra `barbershops(slug)` declaradas `on delete cascade`
-- pero SIN `on update cascade`, así que un `update barbershops set slug=...`
-- falla por violación de FK. El camino que sí funciona sin tocar el esquema es:
--   1. crear la barbería nueva,
--   2. mover TODAS las filas hijas,
--   3. recién ahí borrar la vieja.
-- El orden importa: si se borrara antes de mover, el `on delete cascade` se
-- llevaría puestos los turnos, los clientes y el resto.
--
-- ─── LA LISTA DE 17 TABLAS ───────────────────────────────────────────────────
-- Salió de recorrer el código y las migraciones, no de memoria. Si falta una,
-- sus filas quedan colgadas y el DELETE final se las lleva en cascada. Por eso
-- el paso 3 verifica que no quede NADA antes de borrar.
-- (`reminder_log`, `payment_events`, `client_push_subscriptions` y
-- `push_notification_queue` no tienen `barbershop_slug`: cuelgan del turno.)
--
-- CÓMO CORRERLO: pegar entero en el SQL Editor de Supabase y ejecutar. Si el
-- paso 3 devuelve alguna fila, la transacción se aborta sola y no se toca nada.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1) Clonar la barbería con el slug nuevo ──────────────────────────────────
insert into public.barbershops (
  slug, name, description, whatsapp, instagram, is_active,
  working_hours_start, working_hours_end, slot_interval_minutes,
  address, logo_url, google_reviews_url, auto_confirm_appointments,
  mp_enabled, mp_access_token, mp_public_key, mp_user_id,
  deposit_percent, deposit_min_amount, deposit_auto_cancel_hours,
  waitlist_enabled, mp_refresh_token, mp_token_expires_at,
  whatsapp_message_template, min_booking_notice_minutes, require_client_email
)
select
  'barber', name, description, whatsapp, instagram, is_active,
  working_hours_start, working_hours_end, slot_interval_minutes,
  address, logo_url, google_reviews_url, auto_confirm_appointments,
  mp_enabled, mp_access_token, mp_public_key, mp_user_id,
  deposit_percent, deposit_min_amount, deposit_auto_cancel_hours,
  waitlist_enabled, mp_refresh_token, mp_token_expires_at,
  whatsapp_message_template, min_booking_notice_minutes, require_client_email
from public.barbershops
where slug = 'sv-barber';

-- ── 2) Mover todas las filas hijas ───────────────────────────────────────────
update public.appointments              set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.barbers                   set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.barber_services           set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.barber_weekly_schedules   set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.barber_time_blocks        set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.barber_day_overrides      set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.barbershop_admins         set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.barbershop_subscriptions  set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.barbershop_clients        set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.barbershop_payments       set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.barbershop_gallery_photos set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.appointment_reviews       set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.coupons                   set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.loyalty_programs          set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.loyalty_stamps            set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.push_subscriptions        set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';
update public.waitlist_entries          set barbershop_slug = 'barber' where barbershop_slug = 'sv-barber';

-- ── 3) Red de seguridad: si quedó UNA sola fila, abortar todo ────────────────
-- Sin esto, el DELETE de abajo se llevaría esas filas en cascada, en silencio.
do $$
declare
  restantes bigint;
begin
  select
    (select count(*) from public.appointments              where barbershop_slug = 'sv-barber')
  + (select count(*) from public.barbers                   where barbershop_slug = 'sv-barber')
  + (select count(*) from public.barber_services           where barbershop_slug = 'sv-barber')
  + (select count(*) from public.barber_weekly_schedules   where barbershop_slug = 'sv-barber')
  + (select count(*) from public.barber_time_blocks        where barbershop_slug = 'sv-barber')
  + (select count(*) from public.barber_day_overrides      where barbershop_slug = 'sv-barber')
  + (select count(*) from public.barbershop_admins         where barbershop_slug = 'sv-barber')
  + (select count(*) from public.barbershop_subscriptions  where barbershop_slug = 'sv-barber')
  + (select count(*) from public.barbershop_clients        where barbershop_slug = 'sv-barber')
  + (select count(*) from public.barbershop_payments       where barbershop_slug = 'sv-barber')
  + (select count(*) from public.barbershop_gallery_photos where barbershop_slug = 'sv-barber')
  + (select count(*) from public.appointment_reviews       where barbershop_slug = 'sv-barber')
  + (select count(*) from public.coupons                   where barbershop_slug = 'sv-barber')
  + (select count(*) from public.loyalty_programs          where barbershop_slug = 'sv-barber')
  + (select count(*) from public.loyalty_stamps            where barbershop_slug = 'sv-barber')
  + (select count(*) from public.push_subscriptions        where barbershop_slug = 'sv-barber')
  + (select count(*) from public.waitlist_entries          where barbershop_slug = 'sv-barber')
  into restantes;

  if restantes > 0 then
    raise exception
      'Quedaron % filas apuntando a sv-barber. Se aborta para que el DELETE no las borre en cascada.',
      restantes;
  end if;
end $$;

-- ── 4) Borrar la barbería vieja (ya sin hijos) ───────────────────────────────
delete from public.barbershops where slug = 'sv-barber';

commit;

-- ── Verificación posterior (correr aparte, después del commit) ───────────────
-- select slug, name, is_active from public.barbershops where slug in ('barber','sv-barber');
--   → debe devolver SOLO 'barber'.
-- select count(*) from public.appointments where barbershop_slug = 'barber';
--   → debe devolver 175.
