-- ─────────────────────────────────────────────────────────────────────────────
-- El empleado puede bloquear un horario suyo (feature 023)
--
-- Se va antes, tiene el médico, se toma el franco. Hasta ahora no tenía cómo
-- decirlo: su horario seguía figurando libre y le entraban reservas para un
-- rato en el que no iba a estar. Eso no es un hueco de comodidad — es un
-- cliente llegando a una barbería donde no lo espera nadie.
--
-- ─── EL PRIMER PERMISO QUE SACA DISPONIBILIDAD ──────────────────────────────
-- Los cinco anteriores agregan capacidades sobre lo que ya existe. Éste es el
-- primero que le quita horarios a la barbería, así que el default en `true`
-- merece decirse:
--
--   1. Mejora lo de hoy. El barbero que se va antes hoy no bloquea nada:
--      simplemente no está cuando el cliente llega. Que la app lo sepa es
--      mejor que la app creyendo que está.
--   2. No es invisible. El bloqueo se ve en su propia agenda, y el dueño lo ve
--      en Horarios con el rango y el motivo.
--
-- Y el dueño que prefiera decidirlo él destilda la casilla.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.barber_staff_access
  add column if not exists can_block_time boolean not null default true;

comment on column public.barber_staff_access.can_block_time is
  'Puede bloquear un horario suyo: franco, se va antes, el médico (feature 023). Es el primer permiso que SACA disponibilidad en vez de agregarla; arranca en true porque mejora lo de hoy (el barbero que se va antes no bloquea nada y el horario sigue ofreciéndose) y porque el bloqueo se ve en su agenda y en Horarios del dueño.';

commit;
