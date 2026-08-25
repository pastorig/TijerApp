-- ─────────────────────────────────────────────────────────────────────────────
-- Quién confirmó o canceló cada turno
--
-- ─── PARA QUÉ ────────────────────────────────────────────────────────────────
-- Hasta ahora un turno cambiaba de estado y no quedaba rastro de quién lo hizo,
-- porque había una sola cuenta por barbería: el dueño. Con las cuentas de
-- empleados (feature 016) eso deja de ser cierto, y el dueño va a querer saber
-- quién canceló qué.
--
-- Se suma AHORA y no cuando haga falta: agregar trazabilidad sobre datos que ya
-- se acumularon es mucho más caro, y para el período sin registro no hay forma
-- de recuperar quién fue.
--
-- Aditivo: las filas viejas quedan en null, que se lee como "antes de que esto
-- existiera". No se inventa un responsable retroactivo.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.appointments
  add column if not exists status_changed_by uuid null references auth.users(id),
  add column if not exists status_changed_at timestamptz null;

comment on column public.appointments.status_changed_by is
  'Quién confirmó o canceló por última vez. null = el cambio es anterior a la feature 016, o lo hizo el sistema (cron de señas).';

commit;
