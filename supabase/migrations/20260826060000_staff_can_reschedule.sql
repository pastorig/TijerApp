-- ─────────────────────────────────────────────────────────────────────────────
-- El empleado puede mover un turno suyo (feature 024)
--
-- Es la última capacidad de la lista, y la única que no afecta solo a su
-- agenda: afecta al CLIENTE. Alguien que reservó a las 15 y aparece a las 15
-- porque nadie le avisó que ahora es a las 17.
--
-- ─── EL AVISO NO ES OPCIONAL NI DEPENDE DEL EMPLEADO ────────────────────────
-- Al mover, el servidor manda el mail solo, con la misma plantilla que usa el
-- panel del dueño. En particular lo manda **aunque el empleado no tenga
-- permiso de ver el teléfono del cliente**: ese permiso decide si él puede
-- escribirle, no si al cliente se le avisa.
--
-- Cuando el cliente no dejó mail, la pantalla se lo dice fuerte al barbero y
-- le ofrece el WhatsApp: ahí el aviso queda en sus manos, pero al menos sabe
-- que quedó en sus manos.
--
-- ─── EL BARBERO NO CAMBIA ───────────────────────────────────────────────────
-- A diferencia del drag & drop del dueño, el empleado no puede pasarle el
-- turno a un compañero. Mover dentro de su agenda es lo suyo; decidir sobre la
-- agenda de otro, no.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.barber_staff_access
  add column if not exists can_reschedule boolean not null default true;

comment on column public.barber_staff_access.can_reschedule is
  'Puede mover un turno suyo de día u hora (feature 024). Nunca puede pasárselo a otro barbero. Al mover, el servidor le manda el mail al cliente automáticamente, así el turno no se mueve en silencio aunque el empleado no tenga permiso de ver el teléfono.';

commit;
