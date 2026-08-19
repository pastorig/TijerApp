-- ============================================================================
-- SEGURIDAD (crítico): cerrar el acceso público a `appointments`
-- ============================================================================
-- Date: 2026-08-18
--
-- EL PROBLEMA
-- Producción tenía 6 políticas heredadas que NO están en ninguna migración de
-- este repo (creadas a mano desde el dashboard en una etapa temprana):
--
--   Allow public appointment reads     SELECT  anon           using true
--   Allow public appointment updates   UPDATE  anon           using/check true
--   Allow public appointment inserts   INSERT  anon           check true
--   Allow authenticated ... reads      SELECT  authenticated  using true
--   Allow authenticated ... updates    UPDATE  authenticated  using/check true
--   Allow authenticated ... inserts    INSERT  authenticated  check true
--
-- Las políticas permisivas se combinan con OR, así que anulaban por completo a
-- las restrictivas del repo.
--
-- Verificado contra producción el 2026-08-18 con la anon key (que es pública:
-- viaja en el bundle del browser): se leían 456 de 456 turnos — 6 barberías,
-- 242 teléfonos de clientes reales — junto con el confirmation_token de cada
-- turno, que es la credencial del link público. Con eso cualquiera podía
-- además modificar o cancelar turnos de cualquier barbería, sin cuenta.
--
-- POR QUÉ RECIÉN AHORA SE PUEDE CERRAR
-- La reserva pública insertaba desde el browser con la anon key y hacía
-- insert...select para recuperar el token, así que necesitaba INSERT y SELECT.
-- Borrar las políticas antes de mover eso al servidor habría roto la reserva.
-- Ahora /api/appointments/book crea la reserva con el service role, así que
-- anon no necesita ningún acceso a esta tabla.
--
-- QUIÉN SIGUE ENTRANDO DESPUÉS DE ESTO
--   Reserva pública        -> service role vía /api/appointments/book
--   Link /r/[token]        -> RPC security definer (no pasan por RLS)
--   Disponibilidad pública -> RPC get_public_barber_day_appointments
--   Turnero del admin      -> políticas authenticated de abajo
--   Alta manual del admin  -> política de INSERT de abajo
-- ============================================================================

begin;

-- 1) Fuera las heredadas. `if exists` para que sea idempotente.
drop policy if exists "Allow public appointment reads" on public.appointments;
drop policy if exists "Allow public appointment updates" on public.appointments;
drop policy if exists "Allow public appointment inserts" on public.appointments;
drop policy if exists "Allow authenticated appointment reads" on public.appointments;
drop policy if exists "Allow authenticated appointment updates" on public.appointments;
drop policy if exists "Allow authenticated appointment inserts" on public.appointments;

-- 2) La de insert público del repo también sobra: ya nadie inserta con anon.
drop policy if exists "appointments_public_insert_pending" on public.appointments;

-- 3) El admin sí carga turnos a mano desde el navegador (turno manual y
--    duplicar). Se le permite, pero SOLO en su propia barbería: la política
--    vieja dejaba insertar en cualquiera con tal de que el barbero existiera.
drop policy if exists "appointments_admin_insert_own_barbershop" on public.appointments;
create policy "appointments_admin_insert_own_barbershop"
on public.appointments
for insert
to authenticated
with check (
  public.current_user_has_barbershop_access(barbershop_slug)
);

-- 4) Revocar el acceso de tabla a anon. RLS ya no lo deja pasar, pero sin esto
--    el rol conserva el grant y cualquier política futura lo reabre sin querer.
revoke all on public.appointments from anon;

commit;
