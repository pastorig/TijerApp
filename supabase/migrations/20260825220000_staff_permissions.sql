-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos por empleado (feature 019)
--
-- Hasta acá el acceso de un empleado era todo o nada: el que tenía cuenta veía
-- su agenda con los precios, su comisión, y podía confirmar, cancelar y
-- escribirle a cualquier cliente suyo. La única forma de darle menos era no
-- darle cuenta, y entonces volvía a usar la contraseña del dueño — que es
-- exactamente lo que la feature 016 vino a sacar del medio.
--
-- ─── POR QUÉ EL DEFAULT ES `true` ───────────────────────────────────────────
-- Al revés de lo habitual en permisos, y a propósito. Los accesos que ya
-- existen se dieron cuando el empleado veía todo. Con default `false`, el
-- deploy le sacaría media app a todos los empleados de todas las barberías sin
-- que ningún dueño lo haya pedido, y se leería como que la app se rompió.
--
-- La migración es aditiva: ninguna fila existente cambia de conducta.
--
-- ─── OJO: "VER LO QUE GANA" ES UNA SOLA COLUMNA ─────────────────────────────
-- La plata del empleado aparece en tres lugares (la pestaña Ganancias, el
-- "Te llevás" del día y el precio de cada servicio en su agenda). Es el mismo
-- dato entrando por tres puertas: si mañana alguien parte esto en tres
-- columnas, va a quedar una abierta.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.barber_staff_access
  add column if not exists can_see_earnings boolean not null default true,
  add column if not exists can_confirm boolean not null default true,
  add column if not exists can_cancel boolean not null default true,
  add column if not exists can_contact_client boolean not null default true;

comment on column public.barber_staff_access.can_see_earnings is
  'Su comisión, el total del día y el precio de cada servicio. Los tres juntos: es el mismo dato.';
comment on column public.barber_staff_access.can_confirm is
  'Puede marcar como confirmado un turno suyo.';
comment on column public.barber_staff_access.can_cancel is
  'Puede cancelar un turno suyo y liberar el horario.';
comment on column public.barber_staff_access.can_contact_client is
  'Ve el teléfono del cliente y puede abrirle el WhatsApp.';

commit;
