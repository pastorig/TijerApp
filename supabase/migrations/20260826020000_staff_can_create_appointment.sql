-- ─────────────────────────────────────────────────────────────────────────────
-- El empleado puede cargar el turno del que entra sin reservar (feature 022)
--
-- Un turno que no se anota no es un problema de prolijidad: el horario sigue
-- figurando libre —se lo puede llevar una reserva online mientras el barbero
-- está cortando— y esa plata no entra ni en su comisión ni en los reportes.
--
-- ─── POR QUÉ EL DEFAULT ES `true` SI ES UNA CAPACIDAD NUEVA ─────────────────
-- Los cuatro permisos de la feature 019 arrancan en `true` por un motivo que
-- acá NO aplica: el empleado ya tenía esas capacidades y quitárselas de golpe
-- le habría roto la app. Esta es nueva, así que el default se decide de cero.
--
-- Arranca prendida igual. Un barbero anotando en su propia agenda al que acaba
-- de entrar es exactamente lo que un dueño espera de "que maneje su agenda";
-- el riesgo es bajo y el turno se ve en el turnero del dueño. Con el default
-- apagado la función nacería muerta: nadie entra a Equipo a buscar casillas
-- nuevas que no sabe que existen.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.barber_staff_access
  add column if not exists can_create_appointment boolean not null default true;

comment on column public.barber_staff_access.can_create_appointment is
  'Puede cargar a mano un turno en SU agenda: el que entra sin reservar (feature 022). Default true, como el resto — es lo que un dueño espera de "que maneje su agenda", y con el default apagado la función nacería muerta.';

commit;
