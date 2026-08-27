-- ─────────────────────────────────────────────────────────────────────────────
-- Quién canceló, con nombre (feature 021)
--
-- La feature 016 agregó `status_changed_by` con un motivo declarado: "con
-- empleados, el dueño va a querer saber quién canceló qué". Se venía
-- escribiendo y NINGUNA pantalla lo leía, porque con el user_id solo no
-- alcanza: el dueño **no puede leer `barber_staff_access` desde el navegador**
-- (su RLS deja ver únicamente la propia fila), así que no tiene cómo traducir
-- ese uuid a un nombre.
--
-- ─── POR QUÉ UN SNAPSHOT Y NO UN JOIN ───────────────────────────────────────
-- Es lo que hace cualquier registro de auditoría. Tres razones concretas:
--   1. No necesita join en la pantalla más caliente del panel (el turnero).
--   2. Sigue diciendo la verdad si ese empleado se borra o le revocan el acceso.
--   3. Si el barbero se renombra, el registro conserva el nombre que tenía
--      cuando pasó — que es lo que un registro tiene que hacer.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.appointments
  add column if not exists status_changed_by_name text;

comment on column public.appointments.status_changed_by_name is
  'Nombre de quien confirmó o canceló, guardado en el momento del cambio (feature 021). Es un snapshot a propósito: el dueño no puede leer barber_staff_access por RLS, y el nombre tiene que seguir diciendo la verdad si ese empleado se borra.';

commit;
